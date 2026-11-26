// backend/src/modules/deployments/byoc-cluster.orchestrator.js
// BYOC Cluster Mode — Terraform + ECR + EKS/Kubernetes Orchestrator
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const awsClusterService = require('../projects/awsCluster.service');
const awsClusterRepository = require('../projects/awsCluster.repository');
const deploymentsRepository = require('./deployments.repository');
const { createLogStreamer, redactSecrets } = require('./ec2-deployment.orchestrator');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const TF_DEV_DIR = path.join(REPO_ROOT, 'terraform', 'environments', 'dev');
const K8S_MANIFESTS_DIR = path.join(REPO_ROOT, 'manifests', 'kubernetes');

/**
 * Normalizes a project name/slug into a valid Kubernetes RFC 1123 label (`iiap-<name>`).
 */
function sanitizeK8sName(rawName = 'app') {
    const cleaned = String(rawName)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const prefixed = `iiap-${cleaned || 'app'}`;
    return prefixed.slice(0, 63).replace(/-+$/, '');
}

/**
 * Run a CLI command asynchronously and stream stdout/stderr lines to onLog.
 * Injects sensitive credentials via child-process `env` only (never CLI args or logs).
 */
function runCliCommand(command, args, { cwd, env, stdin, timeoutMs = 600_000, onLog = () => {} } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            shell: process.platform === 'win32',
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
            reject(new Error(`Command '${command} ${args.join(' ')}' timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs);

        if (stdin !== undefined) {
            child.stdin.write(stdin);
            child.stdin.end();
        }

        child.stdout.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            stdout += text;
            for (const line of text.split(/\r?\n/)) {
                if (line.trim()) onLog(line);
            }
        });

        child.stderr.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            stderr += text;
            for (const line of text.split(/\r?\n/)) {
                if (line.trim()) onLog(`[STDERR] ${line}`);
            }
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (!timedOut) {
                resolve({ exitCode: code, stdout, stderr });
            }
        });
    });
}

/**
 * Build isolated AWS environment variables for child processes.
 */
function buildAwsEnv(clusterTarget) {
    const env = {
        AWS_REGION: clusterTarget.awsRegion || 'us-east-1',
        AWS_DEFAULT_REGION: clusterTarget.awsRegion || 'us-east-1',
    };

    if (clusterTarget.authMode === 'ACCESS_KEYS') {
        if (clusterTarget.accessKeyId) env.AWS_ACCESS_KEY_ID = clusterTarget.accessKeyId;
        if (clusterTarget.secretAccessKey) env.AWS_SECRET_ACCESS_KEY = clusterTarget.secretAccessKey;
    } else if (clusterTarget.authMode === 'IAM_ROLE' && clusterTarget.roleArn) {
        env.AWS_ROLE_ARN = clusterTarget.roleArn;
        if (clusterTarget.externalId) env.AWS_EXTERNAL_ID = clusterTarget.externalId;
    }

    return env;
}

/**
 * Renders parameterized Kubernetes manifests (`namespace.yaml`, `deployment.yaml`, `service.yaml`)
 * and an optional `secret.yaml` for project env vars into `outputDir`.
 */
function renderK8sManifests({
    appName,
    namespace,
    imageUri,
    replicas = 1,
    containerPort = 3000,
    envVars = {},
    outputDir,
}) {
    fs.mkdirSync(outputDir, { recursive: true });
    const secretName = 'iiap-env-secret';
    const replacements = {
        __NAMESPACE__: namespace,
        __APP_NAME__: appName,
        __IMAGE_URI__: imageUri,
        __REPLICAS__: String(replicas),
        __CONTAINER_PORT__: String(containerPort),
        __SECRET_NAME__: secretName,
    };

    for (const fileName of ['namespace.yaml', 'deployment.yaml', 'service.yaml']) {
        const templatePath = path.join(K8S_MANIFESTS_DIR, fileName);
        let content = fs.readFileSync(templatePath, 'utf8');
        for (const [token, value] of Object.entries(replacements)) {
            content = content.split(token).join(value);
        }
        fs.writeFileSync(path.join(outputDir, fileName), content, 'utf8');
    }

    const envEntries = Object.entries(envVars || {});
    if (envEntries.length > 0) {
        const secretLines = [
            'apiVersion: v1',
            'kind: Secret',
            'metadata:',
            `  name: ${secretName}`,
            `  namespace: ${namespace}`,
            'type: Opaque',
            'stringData:',
            ...envEntries.map(([k, v]) => `  ${k}: ${JSON.stringify(String(v ?? ''))}`),
            '',
        ];
        fs.writeFileSync(path.join(outputDir, 'secret.yaml'), secretLines.join('\n'), 'utf8');
    }

    return outputDir;
}

/**
 * Builds the project Docker image from GitHub and pushes it to the user's AWS ECR repository.
 */
async function buildAndPushToEcr({
    appName,
    repoUrl,
    branch = 'main',
    githubToken = null,
    awsRegion = 'us-east-1',
    awsEnv,
    dockerfilePath = 'Dockerfile',
    onLog = () => {},
}) {
    onLog('[ECR] Resolving AWS Account ID for ECR registry...');
    const stsRes = await runCliCommand(
        'aws',
        ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'],
        { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 30_000 }
    );
    if (stsRes.exitCode !== 0 || !stsRes.stdout.trim()) {
        throw new Error('Failed to resolve AWS Account ID via `aws sts get-caller-identity`.');
    }

    const accountId = stsRes.stdout.trim();
    const registry = `${accountId}.dkr.ecr.${awsRegion}.amazonaws.com`;
    const ecrRepo = appName;
    const imageUri = `${registry}/${ecrRepo}:latest`;

    onLog(`[ECR] Ensuring repository '${ecrRepo}' exists in ${awsRegion}...`);
    const descRes = await runCliCommand(
        'aws',
        ['ecr', 'describe-repositories', '--repository-names', ecrRepo, '--region', awsRegion],
        { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 30_000 }
    );
    if (descRes.exitCode !== 0) {
        const createRes = await runCliCommand(
            'aws',
            ['ecr', 'create-repository', '--repository-name', ecrRepo, '--region', awsRegion],
            { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 30_000, onLog }
        );
        if (createRes.exitCode !== 0) {
            throw new Error(`Failed to create ECR repository '${ecrRepo}'.`);
        }
    }

    onLog(`[ECR] Authenticating Docker to ${registry}...`);
    const pwRes = await runCliCommand(
        'aws',
        ['ecr', 'get-login-password', '--region', awsRegion],
        { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 30_000 }
    );
    if (pwRes.exitCode !== 0 || !pwRes.stdout.trim()) {
        throw new Error('Failed to obtain ECR login password.');
    }

    const loginRes = await runCliCommand(
        'docker',
        ['login', '--username', 'AWS', '--password-stdin', registry],
        { cwd: REPO_ROOT, env: awsEnv, stdin: pwRes.stdout.trim(), timeoutMs: 30_000, onLog }
    );
    if (loginRes.exitCode !== 0) {
        throw new Error('Docker login to ECR failed.');
    }

    const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iiap-ecr-src-'));
    try {
        let effectiveUrl = repoUrl;
        if (githubToken && repoUrl.startsWith('https://')) {
            effectiveUrl = repoUrl.replace('https://', `https://${githubToken}@`);
        }

        onLog(`[GIT] Cloning ${repoUrl} (${branch}) for container build...`);
        const cloneRes = await runCliCommand(
            'git',
            ['clone', '--depth=1', '--branch', branch, effectiveUrl, cloneDir],
            { cwd: REPO_ROOT, timeoutMs: 120_000, onLog }
        );
        if (cloneRes.exitCode !== 0) {
            throw new Error(`Git clone failed (exit ${cloneRes.exitCode}).`);
        }

        onLog(`[DOCKER] Building image ${imageUri}...`);
        const buildRes = await runCliCommand(
            'docker',
            ['build', '-f', dockerfilePath || 'Dockerfile', '-t', imageUri, '.'],
            { cwd: cloneDir, timeoutMs: 600_000, onLog }
        );
        if (buildRes.exitCode !== 0) {
            throw new Error(`Docker build failed (exit ${buildRes.exitCode}).`);
        }

        onLog(`[ECR] Pushing ${imageUri}...`);
        const pushRes = await runCliCommand(
            'docker',
            ['push', imageUri],
            { cwd: cloneDir, timeoutMs: 600_000, onLog }
        );
        if (pushRes.exitCode !== 0) {
            throw new Error(`Docker push to ECR failed (exit ${pushRes.exitCode}).`);
        }
    } finally {
        fs.rmSync(cloneDir, { recursive: true, force: true });
    }

    return imageUri;
}

/**
 * Execute BYOC Cluster Mode deployment:
 *  1. Transition deployment to PLANNING -> PROVISIONING
 *  2. Decrypt user's AWS credentials (IAM Role / Access Keys)
 *  3. Run Terraform (`terraform/environments/dev`) with user's cluster variables
 *  4. Update kubeconfig via `aws eks update-kubeconfig`
 *  5. Build & push Docker image to user's AWS ECR (when repoUrl is provided)
 *  6. Render isolated namespace + deployment + service + secret manifests & `kubectl apply`
 *  7. Transition to SUCCEEDED (with LoadBalancer URL if available) or FAILED
 */
async function executeByocClusterDeployment({
    deploymentId,
    projectId,
    projectName,
    repoUrl = null,
    branch = 'main',
    githubToken = null,
    replicas = 1,
    containerPort = 3000,
    dockerfilePath = 'Dockerfile',
    envVars = {},
    imageUri = null,
}) {
    let extraSecrets = Object.values(envVars || {}).filter(Boolean);
    const streamer = createLogStreamer(deploymentId, extraSecrets);
    const onLog = (line) => streamer.pushLine(line, { source: 'TERRAFORM', level: 'INFO' });
    let renderedManifestsDir = null;

    try {
        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'PLANNING',
            startedAt: new Date().toISOString(),
        });

        onLog(`[BYOC-CLUSTER] Starting AWS EKS BYOC deployment ${deploymentId.substring(0, 8)} for ${projectName} (branch: ${branch})`);

        const clusterTarget = await awsClusterService.getDecryptedClusterForExecution(projectId);
        extraSecrets = [
            ...extraSecrets,
            clusterTarget.secretAccessKey,
            clusterTarget.accessKeyId,
            githubToken,
        ].filter(Boolean);
        const awsEnv = buildAwsEnv(clusterTarget);

        onLog(`[BYOC-CLUSTER] Target: cluster='${clusterTarget.clusterName}' region='${clusterTarget.awsRegion}' authMode='${clusterTarget.authMode}'`);

        await awsClusterRepository.updateClusterStatus(projectId, { status: 'PROVISIONING' });
        await deploymentsRepository.updateDeploymentStatus(deploymentId, { status: 'PROVISIONING' });

        // 1. Terraform Init & Apply
        const tfVars = [
            `-var=aws_region=${clusterTarget.awsRegion}`,
            `-var=cluster_name=${clusterTarget.clusterName}`,
            `-var=kubernetes_version=${clusterTarget.kubernetesVersion}`,
            `-var=desired_node_count=${clusterTarget.desiredNodes}`,
            `-var=node_instance_types=["${clusterTarget.nodeInstanceType}"]`,
        ];

        onLog(`[TERRAFORM] Initializing workspace in ${TF_DEV_DIR}...`);
        let initRes;
        try {
            initRes = await runCliCommand('terraform', ['init', '-input=false', '-backend=false'], {
                cwd: TF_DEV_DIR,
                env: awsEnv,
                timeoutMs: 180_000,
                onLog,
            });
        } catch (spawnErr) {
            if (spawnErr.code === 'ENOENT') {
                throw new Error(
                    'Terraform CLI (`terraform`) is not installed on the backend worker host. Install Terraform, AWS CLI, Docker, and kubectl on the runner host to provision BYOC EKS clusters.'
                );
            }
            throw spawnErr;
        }

        if (initRes.exitCode !== 0) {
            const combined = `${initRes.stdout || ''}\n${initRes.stderr || ''}`.toLowerCase();
            if (combined.includes('not recognized') || combined.includes('command not found')) {
                throw new Error(
                    'Terraform CLI (`terraform`) is not installed or not in PATH on the backend host. Install Terraform, AWS CLI, Docker, and kubectl to provision BYOC EKS clusters.'
                );
            }
            const detail = (initRes.stderr || initRes.stdout || '').trim().split(/\r?\n/).slice(-4).join(' | ');
            throw new Error(`Terraform init failed (exit ${initRes.exitCode})${detail ? `: ${detail}` : '.'}`);
        }

        onLog(`[TERRAFORM] Applying VPC + EKS infrastructure for ${clusterTarget.clusterName}...`);
        const applyRes = await runCliCommand(
            'terraform',
            ['apply', '-auto-approve', '-input=false', ...tfVars],
            {
                cwd: TF_DEV_DIR,
                env: awsEnv,
                timeoutMs: 1_200_000,
                onLog,
            }
        );

        if (applyRes.exitCode !== 0) {
            throw new Error(`Terraform apply failed (exit ${applyRes.exitCode}).`);
        }

        // 2. Build & Push image to ECR (if repoUrl provided)
        const appName = sanitizeK8sName(projectName);
        const namespace = appName;
        let resolvedImageUri = imageUri;

        if (!resolvedImageUri && repoUrl) {
            await deploymentsRepository.updateDeploymentStatus(deploymentId, { status: 'BUILDING' });
            resolvedImageUri = await buildAndPushToEcr({
                appName,
                repoUrl,
                branch,
                githubToken,
                awsRegion: clusterTarget.awsRegion,
                awsEnv,
                dockerfilePath,
                onLog,
            });
        } else if (!resolvedImageUri) {
            resolvedImageUri = 'nginx:alpine';
        }

        // 3. Configure kubeconfig & apply isolated Kubernetes manifests
        await deploymentsRepository.updateDeploymentStatus(deploymentId, { status: 'DEPLOYING' });
        onLog(`[KUBERNETES] Updating kubeconfig for EKS cluster '${clusterTarget.clusterName}'...`);

        const kubeRes = await runCliCommand(
            'aws',
            ['eks', 'update-kubeconfig', '--region', clusterTarget.awsRegion, '--name', clusterTarget.clusterName],
            { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 60_000, onLog }
        );

        if (kubeRes.exitCode !== 0) {
            throw new Error(`aws eks update-kubeconfig failed (exit ${kubeRes.exitCode}).`);
        }

        let storedEnvVars = {};
        try {
            const envVarsService = require('../projects/envVars.service');
            storedEnvVars = await envVarsService.getDecryptedEnvMap(projectId);
        } catch {
            // Non-blocking fallback
        }
        const mergedEnvVars = { ...storedEnvVars, ...(envVars || {}) };

        renderedManifestsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iiap-k8s-'));
        renderK8sManifests({
            appName,
            namespace,
            imageUri: resolvedImageUri,
            replicas,
            containerPort,
            envVars: mergedEnvVars,
            outputDir: renderedManifestsDir,
        });

        onLog(`[KUBERNETES] Applying manifests into isolated namespace '${namespace}'...`);
        const kubectlRes = await runCliCommand(
            'kubectl',
            ['apply', '-f', renderedManifestsDir],
            { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 120_000, onLog }
        );

        if (kubectlRes.exitCode !== 0) {
            throw new Error(`kubectl apply failed (exit ${kubectlRes.exitCode}).`);
        }

        // Best-effort LoadBalancer URL lookup
        let serviceUrl = null;
        try {
            const svcRes = await runCliCommand(
                'kubectl',
                ['get', 'svc', appName, '-n', namespace, '-o', 'jsonpath={.status.loadBalancer.ingress[0].hostname}'],
                { cwd: REPO_ROOT, env: awsEnv, timeoutMs: 15_000 }
            );
            const hostname = (svcRes.stdout || '').trim();
            if (hostname) {
                serviceUrl = `http://${hostname}`;
            }
        } catch {
            // LoadBalancer provisioning may still be pending
        }

        await awsClusterRepository.updateClusterStatus(projectId, {
            status: 'ONLINE',
            lastVerifiedAt: new Date(),
        });

        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'SUCCEEDED',
            ...(serviceUrl ? { serviceUrl } : {}),
            finishedAt: new Date().toISOString(),
        });

        onLog(`[BYOC-CLUSTER] Deployment SUCCEEDED on EKS cluster '${clusterTarget.clusterName}' (namespace: ${namespace}).`);
        await streamer.flush();
        streamer.emitter.emit('done', { status: 'SUCCEEDED', serviceUrl });
        return { status: 'SUCCEEDED', clusterName: clusterTarget.clusterName, namespace, serviceUrl };
    } catch (error) {
        const rawErr = error.message || 'BYOC Cluster deployment failed';
        const safeErr = redactSecrets(rawErr, extraSecrets);
        streamer.pushLine(`[ERROR] ${safeErr}`, { source: 'SYSTEM', level: 'ERROR' });
        await streamer.flush();

        await awsClusterRepository.updateClusterStatus(projectId, { status: 'FAILED' }).catch(() => {});
        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'FAILED',
            errorMessage: safeErr,
            finishedAt: new Date().toISOString(),
        }).catch(() => {});

        streamer.emitter.emit('done', { status: 'FAILED', errorMessage: safeErr });
        return { status: 'FAILED', errorMessage: safeErr };
    } finally {
        if (renderedManifestsDir) {
            fs.rmSync(renderedManifestsDir, { recursive: true, force: true });
        }
    }
}

module.exports = {
    buildAwsEnv,
    sanitizeK8sName,
    renderK8sManifests,
    executeByocClusterDeployment,
};
