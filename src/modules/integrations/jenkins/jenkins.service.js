// backend/src/modules/integrations/jenkins/jenkins.service.js
const jenkinsConfig = require('./jenkins.config');

class JenkinsIntegrationError extends Error {
    constructor(message, originalError = null, statusCode = 502, isTimeout = false) {
        super(message);
        this.name = 'JenkinsIntegrationError';
        this.originalError = originalError;
        this.statusCode = statusCode;
        this.isTimeout = isTimeout;
    }
}

/**
 * Sanitizes and truncates external CI server error strings.
 * Ensures HTML error pages, stack traces, and internal server paths are never exposed.
 * Enforces a maximum length of 250 characters.
 */
function sanitizeErrorMessage(rawText, maxLength = 250) {
    if (!rawText || typeof rawText !== 'string') {
        return 'Unknown CI pipeline error';
    }

    // 1. Strip all HTML tags
    let sanitized = rawText.replace(/<[^>]*>/g, ' ');

    // 2. Redact potential credential or token exposures
    sanitized = sanitized.replace(
        /(?:bearer|basic|token|password|secret|authorization)[:=\s]+[^\s,;&]+/gi,
        '[REDACTED]'
    );

    // 3. Normalize multiple whitespace and newlines
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    if (!sanitized) {
        return 'CI service returned empty error response';
    }

    // 4. Truncate to maximum length
    if (sanitized.length > maxLength) {
        return `${sanitized.substring(0, maxLength - 3)}...`;
    }

    return sanitized;
}

/**
 * Formats a Jenkins job name, supporting nested Jenkins folders:
 * "team/infra/pipeline" -> "/job/team/job/infra/job/pipeline"
 */
function formatJobUrlPath(jobName) {
    return jobName
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/job/');
}

/**
 * Attempts to retrieve a Jenkins CSRF Crumb when CSRF protection is enabled.
 * Safely degrades if CSRF protection is disabled (404) or crumb issuer is unreachable.
 * Never logs or exposes credentials.
 */
async function fetchCsrfCrumb({ jenkinsUrl, authHeader, timeoutMs }) {
    const crumbUrl = `${jenkinsUrl}/crumbIssuer/api/json`;
    const headers = {};
    if (authHeader) {
        headers['Authorization'] = authHeader;
    }

    try {
        const response = await fetch(crumbUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
            // CSRF protection may be disabled or crumb endpoint unavailable (e.g. 404)
            return null;
        }

        const data = await response.json();
        if (data && data.crumb && data.crumbRequestField) {
            return {
                headerName: data.crumbRequestField,
                value: data.crumb,
            };
        }
        return null;
    } catch (err) {
        // Safe non-fatal degradation: proceeding without crumb
        return null;
    }
}

/**
 * Builds the agreed deployment job contract for the Jenkins pipeline / CI worker.
 *
 * CRITICAL SECURITY RULE:
 * Never include raw credentials, secrets, or private keys.
 * Only include safe, non-secret references (e.g. AWS Secrets Manager or Vault paths).
 */
function buildDeploymentContract({
    project,
    deployment,
    branch,
    commitSha,
    environment,
    dockerfilePath,
    replicas,
    correlationId,
    user,
}) {
    const repoFullName = project.github_repo_full_name || '';
    const repoOwner =
        project.github_repo_owner || (repoFullName ? repoFullName.split('/')[0] : '');
    const repoUrl =
        project.repository_url ||
        (repoFullName ? `https://github.com/${repoFullName}.git` : '');

    return {
        contractVersion: '1.0.0',
        correlationId: correlationId || `corr-${deployment.id}-${Date.now()}`,
        projectId: project.id,
        deploymentId: deployment.id,
        repository: {
            id: project.github_repo_id || null,
            fullName: repoFullName,
            owner: repoOwner,
            url: repoUrl,
        },
        git: {
            branch,
            commitSha,
        },
        targetEnvironment: environment,
        build: {
            dockerfilePath: dockerfilePath || 'Dockerfile',
            replicas: replicas || 1,
        },
        target: {
            platform: 'Kubernetes',
            provider: 'AWS_EKS',
            namespace: `app-${project.slug}`,
            cluster: 'k8s-cluster',
        },
        secretReferences: [
            // Secret references only — no plaintext secret values or credentials!
            {
                name: 'APP_SECRETS',
                reference: `secretsmanager:projects/${project.slug}/${environment}`,
                type: 'AWS_SECRETS_MANAGER_REF',
            },
        ],
        callbackUrl: `${process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000'}/api/deployments/${deployment.id}/status`,
        triggeredBy: {
            userId: user.id,
            userRole: user.role,
        },
        timestamp: new Date().toISOString(),
    };
}

/**
 * Publishes / triggers the deployment job in Jenkins.
 * Supports CSRF crumb handling, folder jobs, error sanitization, and timeout detection.
 */
async function triggerDeploymentJob(contractPayload) {
    const mode = jenkinsConfig.integrationMode();

    if (mode === 'mock') {
        return {
            success: true,
            provider: 'JENKINS',
            jobId: `mock-jenkins-job-${Date.now()}`,
            queueItemUrl: `${jenkinsConfig.url()}/queue/item/${Math.floor(Math.random() * 10000)}/`,
            status: 'QUEUED',
        };
    }

    const jenkinsUrl = jenkinsConfig.url();
    const jobPath = formatJobUrlPath(jenkinsConfig.jobName());
    const buildUrl = `${jenkinsUrl}/job/${jobPath}/buildWithParameters`;

    const formParams = new URLSearchParams({
        PROJECT_ID: contractPayload.projectId,
        DEPLOYMENT_ID: contractPayload.deploymentId,
        REPO_URL: contractPayload.repository.url || '',
        BRANCH: contractPayload.git.branch || '',
        COMMIT_SHA: contractPayload.git.commitSha || '',
        ENVIRONMENT: contractPayload.targetEnvironment,
        DOCKERFILE_PATH: contractPayload.build.dockerfilePath || 'Dockerfile',
        CORRELATION_ID: contractPayload.correlationId,
        CALLBACK_URL: contractPayload.callbackUrl,
        JOB_PAYLOAD: JSON.stringify(contractPayload),
    });

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Correlation-Id': contractPayload.correlationId,
    };

    let authHeader = null;
    if (jenkinsConfig.user() && jenkinsConfig.apiToken()) {
        const authString = Buffer.from(
            `${jenkinsConfig.user()}:${jenkinsConfig.apiToken()}`
        ).toString('base64');
        authHeader = `Basic ${authString}`;
        headers['Authorization'] = authHeader;
    }

    // Retrieve CSRF crumb if required by Jenkins
    const crumb = await fetchCsrfCrumb({
        jenkinsUrl,
        authHeader,
        timeoutMs: 3000,
    });
    if (crumb) {
        headers[crumb.headerName] = crumb.value;
    }

    let response;
    try {
        response = await fetch(buildUrl, {
            method: 'POST',
            headers,
            body: formParams.toString(),
            signal: AbortSignal.timeout(jenkinsConfig.requestTimeoutMs()),
        });
    } catch (err) {
        const isTimeout =
            err.name === 'TimeoutError' ||
            err.name === 'AbortError' ||
            err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            (typeof err.message === 'string' &&
                err.message.toLowerCase().includes('timeout'));

        const cleanMessage = sanitizeErrorMessage(
            isTimeout
                ? `Connection timed out after ${jenkinsConfig.requestTimeoutMs()}ms reaching Jenkins at ${jenkinsUrl}`
                : `Network error connecting to Jenkins service: ${err.message}`
        );

        throw new JenkinsIntegrationError(
            cleanMessage,
            err,
            isTimeout ? 504 : 502,
            isTimeout
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new JenkinsIntegrationError(
            `Authentication failed with Jenkins server (HTTP ${response.status})`,
            null,
            502,
            false
        );
    }

    if (!response.ok && response.status !== 201) {
        const rawBody = await response.text().catch(() => '');
        const cleanErr = sanitizeErrorMessage(rawBody);
        throw new JenkinsIntegrationError(
            `Jenkins returned status HTTP ${response.status}: ${cleanErr}`,
            null,
            502,
            false
        );
    }

    const locationHeader =
        response.headers.get('Location') || response.headers.get('location');
    const queueItemUrl =
        locationHeader || `${jenkinsUrl}/job/${jobPath}/`;
    const queueIdMatch = queueItemUrl.match(/\/queue\/item\/(\d+)\/?/);
    const externalJobId = queueIdMatch
        ? queueIdMatch[1]
        : `job-${contractPayload.deploymentId}`;

    return {
        success: true,
        provider: 'JENKINS',
        jobId: externalJobId,
        queueItemUrl,
        status: 'QUEUED',
    };
}

module.exports = {
    JenkinsIntegrationError,
    sanitizeErrorMessage,
    formatJobUrlPath,
    fetchCsrfCrumb,
    buildDeploymentContract,
    triggerDeploymentJob,
};
