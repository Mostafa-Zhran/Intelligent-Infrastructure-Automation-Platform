// backend/src/modules/deployments/ec2-runner.service.js
// SAAS-04 + SAAS-05 — Remote Docker Engine Bootstrap, Workspace, Clone, Build & Run
'use strict';

const path = require('path');
const { execCommand, withSshConnection } = require('./ssh-client.service');

// ─── Constants ────────────────────────────────────────────────────────────────

const IIAP_BASE_DIR = '/opt/iiap/apps';
const DOCKER_INSTALL_TIMEOUT_MS = 300_000; // 5 minutes
const BUILD_TIMEOUT_MS = 600_000; // 10 minutes
const GIT_TIMEOUT_MS = 120_000; // 2 minutes
const CONTAINER_START_TIMEOUT_MS = 60_000; // 1 minute

/**
 * Build an absolute path for a project workspace on the remote EC2.
 * @param {string} projectId
 * @returns {{ workspaceDir: string, srcDir: string }}
 */
function getProjectPaths(projectId) {
    const workspaceDir = `${IIAP_BASE_DIR}/${projectId}`;
    const srcDir = `${workspaceDir}/src`;
    return { workspaceDir, srcDir };
}

// ─── SAAS-04: Docker Bootstrap ────────────────────────────────────────────────

/**
 * Ensure Docker is installed on the remote EC2 instance.
 * - If Docker is already present and functional, this is a no-op.
 * - If missing, runs the official get.docker.com install script.
 * - Adds the SSH user to the `docker` group for password-less access.
 * - Verifies `docker info` works afterwards.
 *
 * @param {object} conn - Active ssh2 connection handle
 * @param {object} target - Sanitized EC2 target config (publicIp, sshUser, etc.)
 * @param {function} onLog - Streaming log callback: (line: string) => void
 */
async function bootstrapDockerOnEc2(conn, target, onLog = () => {}) {
    const log = (msg) => onLog(`[DOCKER-BOOTSTRAP] ${msg}`);

    log('Checking if Docker is installed...');

    // Step 1: Check if docker binary exists
    const checkResult = await execCommand(conn, 'command -v docker 2>/dev/null && docker --version 2>/dev/null || echo "DOCKER_MISSING"', {
        timeoutMs: 15_000,
        onStdout: (chunk) => log(chunk.trim()),
    });

    const dockerMissing = checkResult.stdout.includes('DOCKER_MISSING') || checkResult.exitCode !== 0;

    if (!dockerMissing) {
        log('Docker is already installed: ' + checkResult.stdout.trim());
    } else {
        log('Docker not found. Installing via get.docker.com...');

        // Step 2: Download & run official Docker install script
        const installCmd = [
            'curl -fsSL https://get.docker.com -o /tmp/get-docker.sh',
            'sh /tmp/get-docker.sh',
            'rm -f /tmp/get-docker.sh',
        ].join(' && ');

        const installResult = await execCommand(conn, `sudo sh -c '${installCmd}'`, {
            timeoutMs: DOCKER_INSTALL_TIMEOUT_MS,
            onStdout: (chunk) => log(chunk.trim()),
            onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
        });

        if (installResult.exitCode !== 0) {
            const err = new Error(`Docker installation failed (exit ${installResult.exitCode}): ${installResult.stderr.slice(0, 500)}`);
            err.code = 'DOCKER_INSTALL_FAILED';
            throw err;
        }

        log('Docker installed successfully.');
    }

    // Step 3: Add user to docker group (idempotent)
    log(`Adding user '${target.sshUser}' to docker group...`);
    const groupResult = await execCommand(
        conn,
        `sudo usermod -aG docker ${target.sshUser} 2>/dev/null || true`,
        { timeoutMs: 15_000 }
    );
    if (groupResult.exitCode !== 0) {
        log(`Warning: Could not add user to docker group: ${groupResult.stderr.trim()}`);
    } else {
        log('User added to docker group.');
    }

    // Step 4: Verify docker info works (may need sudo if group change not yet effective)
    log('Verifying Docker daemon is running...');
    const verifyResult = await execCommand(
        conn,
        'docker info >/dev/null 2>&1 || sudo docker info >/dev/null 2>&1',
        { timeoutMs: 30_000 }
    );

    if (verifyResult.exitCode !== 0) {
        // Try starting the Docker service
        log('Docker daemon not running. Attempting to start...');
        await execCommand(conn, 'sudo systemctl enable docker && sudo systemctl start docker', {
            timeoutMs: 30_000,
            onStdout: (chunk) => log(chunk.trim()),
        });

        const retryVerify = await execCommand(
            conn,
            'docker info >/dev/null 2>&1 || sudo docker info >/dev/null 2>&1',
            { timeoutMs: 20_000 }
        );
        if (retryVerify.exitCode !== 0) {
            const err = new Error('Docker daemon is not responding after install. Ensure systemd/init is available.');
            err.code = 'DOCKER_DAEMON_UNAVAILABLE';
            throw err;
        }
    }

    log('Docker daemon is healthy. Bootstrap complete.');
}

// ─── Workspace ────────────────────────────────────────────────────────────────

/**
 * Create the project workspace directories on the remote EC2 instance.
 * Layout: /opt/iiap/apps/<projectId>/src/
 *
 * @param {object} conn - Active ssh2 connection handle
 * @param {string} projectId
 * @param {function} onLog
 */
async function createWorkspaceDir(conn, projectId, onLog = () => {}) {
    const log = (msg) => onLog(`[WORKSPACE] ${msg}`);
    const { srcDir } = getProjectPaths(projectId);

    log(`Creating workspace: ${srcDir}`);
    const result = await execCommand(conn, `sudo mkdir -p ${srcDir} && sudo chown -R $(whoami):$(whoami) ${IIAP_BASE_DIR}`, {
        timeoutMs: 15_000,
        onStdout: (chunk) => log(chunk.trim()),
        onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
    });

    if (result.exitCode !== 0) {
        const err = new Error(`Failed to create workspace directory ${srcDir}: ${result.stderr.slice(0, 300)}`);
        err.code = 'WORKSPACE_CREATE_FAILED';
        throw err;
    }

    log(`Workspace ready at ${srcDir}`);
    return srcDir;
}

// ─── SAAS-05: Repo Clone / Pull ───────────────────────────────────────────────

/**
 * Clone a repository into the src directory, or pull if it already exists.
 * Uses the HTTPS repository URL — no SSH key cloning needed.
 *
 * @param {object} conn
 * @param {string} projectId
 * @param {string} repoUrl - HTTPS clone URL (e.g. https://github.com/owner/repo.git)
 * @param {string} branch - e.g. 'main'
 * @param {function} onLog
 * @param {string|null} githubToken - Optional OAuth token for private repos; injected into the HTTPS URL
 */
async function cloneOrPullRepo(conn, projectId, repoUrl, branch = 'main', onLog = () => {}, githubToken = null) {
    const log = (msg) => onLog(`[GIT] ${msg}`);
    const { srcDir } = getProjectPaths(projectId);

    // Inject token into HTTPS URL for private repos: https://<token>@github.com/...
    let effectiveUrl = repoUrl;
    if (githubToken && repoUrl.startsWith('https://')) {
        effectiveUrl = repoUrl.replace('https://', `https://${githubToken}@`);
        log(`Using authenticated clone URL for private repository`);
    }

    log(`Syncing repository ${repoUrl} (branch: ${branch}) → ${srcDir}`);

    // Check if .git directory exists (previous clone)
    const checkGit = await execCommand(conn, `test -d ${srcDir}/.git && echo "EXISTS" || echo "MISSING"`, {
        timeoutMs: 10_000,
    });

    let gitCmd;
    if (checkGit.stdout.trim() === 'EXISTS') {
        log('Repository already cloned. Pulling latest changes...');
        // Update remote URL with fresh token (token may have rotated)
        gitCmd = [
            `cd ${srcDir}`,
            effectiveUrl !== repoUrl ? `git remote set-url origin ${effectiveUrl}` : 'true',
            `git fetch origin`,
            `git checkout ${branch}`,
            `git reset --hard origin/${branch}`,
        ].join(' && ');
    } else {
        log('Cloning repository...');
        gitCmd = `git clone --depth=1 --branch ${branch} ${effectiveUrl} ${srcDir}`;
    }

    const result = await execCommand(conn, gitCmd, {
        timeoutMs: GIT_TIMEOUT_MS,
        onStdout: (chunk) => log(chunk.trim()),
        onStderr: (chunk) => log(chunk.trim()),
    });

    if (result.exitCode !== 0) {
        const err = new Error(`Git operation failed (exit ${result.exitCode}): ${result.stderr.slice(0, 500)}`);
        err.code = 'GIT_CLONE_FAILED';
        throw err;
    }

    log('Repository sync complete.');
}

// ─── SAAS-05: Env File ────────────────────────────────────────────────────────

/**
 * Write a .env file into the project workspace directory via SFTP or echo.
 * File is chmod 0600 to protect secrets.
 *
 * @param {object} conn
 * @param {string} projectId
 * @param {Object.<string, string>} envVars - key-value pairs
 * @param {function} onLog
 */
async function writeEnvFile(conn, projectId, envVars = {}, onLog = () => {}) {
    const log = (msg) => onLog(`[ENV] ${msg}`);
    const { workspaceDir } = getProjectPaths(projectId);
    const envFilePath = `${workspaceDir}/.env`;

    if (!envVars || Object.keys(envVars).length === 0) {
        log('No environment variables provided. Skipping .env file creation.');
        // Create empty .env to avoid --env-file errors
        await execCommand(conn, `touch ${envFilePath} && chmod 0600 ${envFilePath}`, { timeoutMs: 10_000 });
        return envFilePath;
    }

    log(`Writing ${Object.keys(envVars).length} environment variables to ${envFilePath}`);

    // Build the env file content and write atomically via printf
    const envContent = Object.entries(envVars)
        .map(([k, v]) => {
            // Escape single quotes in values for shell safety
            const safeValue = String(v).replace(/'/g, "'\\''");
            return `${k}='${safeValue}'`;
        })
        .join('\n');

    // Use printf to write the file (avoids echo interpretation of special chars)
    // Write to a temp file then atomically move to avoid partial writes
    const tempPath = `/tmp/iiap_env_${projectId}`;
    const writeCmd = [
        `printf '%s\\n' '${envContent.replace(/'/g, "'\\''")}' > ${tempPath}`,
        `chmod 0600 ${tempPath}`,
        `mv ${tempPath} ${envFilePath}`,
    ].join(' && ');

    const result = await execCommand(conn, writeCmd, { timeoutMs: 15_000 });

    if (result.exitCode !== 0) {
        const err = new Error(`Failed to write .env file: ${result.stderr.slice(0, 300)}`);
        err.code = 'ENV_WRITE_FAILED';
        throw err;
    }

    log('.env file written and secured with chmod 0600.');
    return envFilePath;
}

// ─── SAAS-05: Docker Build ────────────────────────────────────────────────────

/**
 * Build a Docker image from the cloned repository source.
 *
 * @param {object} conn
 * @param {string} projectId
 * @param {string} projectName - Used as the image tag base
 * @param {string} dockerfilePath - Relative path inside srcDir (e.g. 'Dockerfile' or 'docker/Dockerfile')
 * @param {function} onLog
 * @returns {string} imageTag
 */
async function buildContainer(conn, projectId, projectName, dockerfilePath = 'Dockerfile', onLog = () => {}) {
    const log = (msg) => onLog(`[BUILD] ${msg}`);
    const { srcDir } = getProjectPaths(projectId);

    // Sanitize image tag (lowercase, alphanumeric, hyphens only)
    const safeImageName = `iiap-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const imageTag = `${safeImageName}:latest`;

    // Resolve Dockerfile path relative to srcDir
    const normalizedDockerfilePath = dockerfilePath.startsWith('/')
        ? dockerfilePath
        : `${srcDir}/${dockerfilePath}`;

    log(`Building image ${imageTag} from ${normalizedDockerfilePath}...`);
    log(`Build context: ${srcDir}`);

    const buildCmd = [
        `cd ${srcDir}`,
        // Use sudo if docker group change hasn't taken effect in current session
        `docker build --no-cache -t ${imageTag} -f ${normalizedDockerfilePath} . 2>&1`,
    ].join(' && ');

    // Try without sudo first, fall back with sudo
    let result = await execCommand(conn, buildCmd, {
        timeoutMs: BUILD_TIMEOUT_MS,
        onStdout: (chunk) => log(chunk.trim()),
        onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
    });

    const combinedBuildOut = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.exitCode !== 0 && combinedBuildOut.toLowerCase().includes('permission denied')) {
        log('Retrying build with sudo...');
        const sudoBuildCmd = buildCmd.replace('docker build', 'sudo docker build');
        result = await execCommand(conn, sudoBuildCmd, {
            timeoutMs: BUILD_TIMEOUT_MS,
            onStdout: (chunk) => log(chunk.trim()),
            onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
        });
    }

    if (result.exitCode !== 0) {
        const tailLines = `${result.stdout || ''}\n${result.stderr || ''}`
            .trim()
            .split(/\r?\n/)
            .slice(-6)
            .join(' | ');
        const err = new Error(
            `Docker build failed (exit ${result.exitCode})${tailLines ? `: ${tailLines.slice(0, 400)}` : '. Check the build output above.'}`
        );
        err.code = 'DOCKER_BUILD_FAILED';
        throw err;
    }

    log(`Image ${imageTag} built successfully.`);
    return imageTag;
}

// ─── SAAS-05: Docker Run ──────────────────────────────────────────────────────

/**
 * Stop/remove any existing container for this project, then start a fresh one.
 * Applies --restart unless-stopped and mounts the .env file.
 *
 * @param {object} conn
 * @param {string} projectId
 * @param {string} projectName
 * @param {number} hostPort - Port on EC2 instance accessible from internet
 * @param {number} containerPort - Port the application listens on inside the container
 * @param {function} onLog
 * @returns {{ containerId: string, containerName: string }}
 */
async function runContainer(conn, projectId, projectName, hostPort, containerPort, onLog = () => {}) {
    const log = (msg) => onLog(`[RUN] ${msg}`);
    const { workspaceDir } = getProjectPaths(projectId);

    const safeImageName = `iiap-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const containerName = safeImageName;
    const imageTag = `${safeImageName}:latest`;
    const envFilePath = `${workspaceDir}/.env`;

    // Step 1: Stop and remove old container if exists
    log(`Stopping existing container '${containerName}' (if running)...`);
    await execCommand(
        conn,
        `docker stop ${containerName} 2>/dev/null || sudo docker stop ${containerName} 2>/dev/null || true`,
        { timeoutMs: 30_000 }
    );
    await execCommand(
        conn,
        `docker rm ${containerName} 2>/dev/null || sudo docker rm ${containerName} 2>/dev/null || true`,
        { timeoutMs: 15_000 }
    );
    log('Old container removed (or did not exist).');

    // Step 2: Run new container
    log(`Starting container '${containerName}' on host port ${hostPort} → container port ${containerPort}...`);
    const runCmd = [
        `docker run -d`,
        `--name ${containerName}`,
        `--restart unless-stopped`,
        `-p ${hostPort}:${containerPort}`,
        `--env-file ${envFilePath}`,
        imageTag,
    ].join(' ');

    let result = await execCommand(conn, runCmd, {
        timeoutMs: CONTAINER_START_TIMEOUT_MS,
        onStdout: (chunk) => log(chunk.trim()),
        onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
    });

    const combinedRunOut = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.exitCode !== 0 && combinedRunOut.toLowerCase().includes('permission denied')) {
        log('Retrying run with sudo...');
        result = await execCommand(conn, `sudo ${runCmd}`, {
            timeoutMs: CONTAINER_START_TIMEOUT_MS,
            onStdout: (chunk) => log(chunk.trim()),
            onStderr: (chunk) => log(`[STDERR] ${chunk.trim()}`),
        });
    }

    if (result.exitCode !== 0) {
        // Capture container logs before failing
        const logsResult = await execCommand(
            conn,
            `docker logs ${containerName} 2>&1 | tail -50 || sudo docker logs ${containerName} 2>&1 | tail -50 || true`,
            { timeoutMs: 15_000 }
        );
        const containerLogs = logsResult.stdout.trim();
        if (containerLogs) {
            log(`=== Container startup logs ===\n${containerLogs}`);
        }
        const err = new Error(`Failed to start container '${containerName}' (exit ${result.exitCode}).`);
        err.code = 'CONTAINER_START_FAILED';
        throw err;
    }

    const containerId = result.stdout.trim().substring(0, 12);
    log(`Container '${containerName}' started. ID: ${containerId}`);
    log(`Application accessible at http://<ec2-ip>:${hostPort}`);

    return { containerId, containerName };
}

// ─── Full Orchestrated Deployment Pipeline ────────────────────────────────────

/**
 * SAAS-04 + SAAS-05: Run the full EC2 deployment pipeline over a single SSH connection.
 *
 * Steps:
 *   1. Bootstrap Docker (if not installed)
 *   2. Create workspace directory
 *   3. Clone or pull the repository
 *   4. Write .env file
 *   5. Build Docker image
 *   6. Run container
 *
 * @param {object} execTarget - From ec2TargetService.getDecryptedTargetForExecution()
 * @param {object} deploymentConfig
 * @param {string} deploymentConfig.repoUrl
 * @param {string} deploymentConfig.branch
 * @param {string} deploymentConfig.projectName
 * @param {Object.<string, string>} deploymentConfig.envVars
 * @param {string|null} [deploymentConfig.githubToken] - Optional GitHub OAuth token for private repos
 * @param {function} onLog - Streaming callback: (line: string) => void
 * @returns {{ imageTag: string, containerId: string, containerName: string }}
 */
async function runEc2Deployment(execTarget, deploymentConfig, onLog = () => {}) {
    const { repoUrl, branch = 'main', projectName, envVars = {}, githubToken = null } = deploymentConfig;
    const { publicIp, sshUser, sshPort, sshPrivateKey, dockerfilePath, hostPort, containerPort } = execTarget;
    const projectId = execTarget.projectId;

    return withSshConnection(
        {
            host: publicIp,
            port: sshPort,
            username: sshUser,
            privateKey: sshPrivateKey,
        },
        async (conn) => {
            // 1. Bootstrap Docker
            await bootstrapDockerOnEc2(conn, { sshUser }, onLog);

            // 2. Create workspace
            await createWorkspaceDir(conn, projectId, onLog);

            // 3. Clone / pull repo
            await cloneOrPullRepo(conn, projectId, repoUrl, branch, onLog, githubToken);

            // 4. Write .env file
            await writeEnvFile(conn, projectId, envVars, onLog);

            // 5. Build image
            const imageTag = await buildContainer(conn, projectId, projectName, dockerfilePath, onLog);

            // 6. Run container
            const { containerId, containerName } = await runContainer(
                conn,
                projectId,
                projectName,
                hostPort,
                containerPort,
                onLog
            );

            return { imageTag, containerId, containerName };
        }
    );
}

module.exports = {
    getProjectPaths,
    bootstrapDockerOnEc2,
    createWorkspaceDir,
    cloneOrPullRepo,
    writeEnvFile,
    buildContainer,
    runContainer,
    runEc2Deployment,
};
