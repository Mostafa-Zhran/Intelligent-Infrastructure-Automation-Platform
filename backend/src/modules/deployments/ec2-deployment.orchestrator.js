// backend/src/modules/deployments/ec2-deployment.orchestrator.js
// SAAS-06 + SAAS-07 — Orchestrates EC2 deployment, live log streaming with secret redaction,
// HTTP readiness probe, and runtime container log capture.
'use strict';

const { EventEmitter } = require('events');
const ec2TargetService = require('../projects/ec2Target.service');
const ec2RunnerService = require('./ec2-runner.service');
const ec2HealthService = require('./ec2-health.service');
const sshClientService = require('./ssh-client.service');
const deploymentsRepository = require('./deployments.repository');

// In-memory emitter per deploymentId for live SSE log streaming
const streamEmitters = new Map();

// Secret redaction patterns (kept in sync with deployments.service.js)
const SECRET_PATTERNS = [
    /password\s*[:=]\s*\S+/gi,
    /secret\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
    /private[_-]?key\s*[:=]\s*[\s\S]{0,500}/gi,
    /-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----/g,
    /Authorization:\s*Bearer\s+\S+/gi,
];

function redactSecrets(message, extraSecrets = []) {
    if (!message || typeof message !== 'string') return message;
    let sanitized = message;
    for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    for (const secretVal of extraSecrets) {
        if (secretVal && typeof secretVal === 'string' && secretVal.length >= 4) {
            sanitized = sanitized.split(secretVal).join('[REDACTED]');
        }
    }
    return sanitized;
}

function getOrCreateEmitter(deploymentId) {
    if (!streamEmitters.has(deploymentId)) {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(50);
        streamEmitters.set(deploymentId, emitter);
    }
    return streamEmitters.get(deploymentId);
}

function getEmitter(deploymentId) {
    return streamEmitters.get(deploymentId) || null;
}

function cleanupEmitter(deploymentId) {
    const emitter = streamEmitters.get(deploymentId);
    if (emitter) {
        emitter.removeAllListeners();
        streamEmitters.delete(deploymentId);
    }
}

/**
 * Create a buffered log streamer that:
 *  - Redacts secrets (including envVar values & SSH private key)
 *  - Emits each log line to active SSE subscribers immediately
 *  - Batches DB writes to deployment_logs
 */
function createLogStreamer(deploymentId, extraSecrets = []) {
    const emitter = getOrCreateEmitter(deploymentId);
    const pendingBatch = [];
    let flushing = false;

    const flush = async () => {
        if (flushing || pendingBatch.length === 0) return;
        flushing = true;
        try {
            const batch = pendingBatch.splice(0, pendingBatch.length);
            await deploymentsRepository.saveDeploymentLogs(deploymentId, batch);
        } catch {
            // Non-blocking DB log write
        } finally {
            flushing = false;
        }
    };

    const pushLine = (rawLine, { source = 'DOCKER', level = 'INFO' } = {}) => {
        if (!rawLine) return;
        const lines = String(rawLine).split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
            const redacted = redactSecrets(line, extraSecrets);
            const entry = {
                source,
                level: redacted.includes('[STDERR]') || redacted.toLowerCase().includes('error') ? 'ERROR' : level,
                message: redacted,
                logged_at: new Date(),
            };
            pendingBatch.push(entry);
            emitter.emit('log', {
                source: entry.source,
                level: entry.level,
                message: entry.message,
                loggedAt: entry.logged_at.toISOString(),
            });
        }

        if (pendingBatch.length >= 10) {
            void flush();
        }
    };

    return { pushLine, flush, emitter };
}

/**
 * Capture recent runtime logs from a running container on EC2.
 */
async function captureRuntimeLogs(execTarget, projectName, { tail = 100 } = {}) {
    const safeName = `iiap-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    return sshClientService.withSshConnection(
        {
            host: execTarget.publicIp,
            port: execTarget.sshPort,
            username: execTarget.sshUser,
            privateKey: execTarget.sshPrivateKey,
        },
        async (conn) => {
            const result = await sshClientService.execCommand(
                conn,
                `docker logs --tail ${Number(tail)} ${safeName} 2>&1 || sudo docker logs --tail ${Number(tail)} ${safeName} 2>&1 || true`,
                { timeoutMs: 15_000 }
            );
            return redactSecrets(result.stdout || '');
        }
    );
}

/**
 * Execute the full end-to-end EC2 deployment pipeline:
 *  1. Transition deployment to RUNNING
 *  2. Decrypt EC2 SSH target
 *  3. Bootstrap Docker, create workspace, clone/pull, write .env, build, run
 *  4. Run SAAS-07 HTTP readiness probe (5 attempts, 3s backoff)
 *  5. Transition to SUCCEEDED (with serviceUrl) or FAILED (with error & container logs)
 */
async function executeEc2Deployment({
    deploymentId,
    projectId,
    projectName,
    repoUrl,
    branch = 'main',
    envVars = {},
    githubToken = null,
}) {
    const extraSecrets = Object.values(envVars || {}).filter(Boolean);
    const streamer = createLogStreamer(deploymentId, extraSecrets);
    const onLog = (line) => streamer.pushLine(line, { source: 'DOCKER', level: 'INFO' });

    try {
        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'DEPLOYING',
            startedAt: new Date().toISOString(),
        });

        onLog(`[ORCHESTRATOR] Starting EC2 deployment ${deploymentId.substring(0, 8)} for ${projectName}`);

        const execTarget = await ec2TargetService.getDecryptedTargetForExecution(projectId);
        if (execTarget.sshPrivateKey) {
            extraSecrets.push(execTarget.sshPrivateKey);
        }

        const runResult = await ec2RunnerService.runEc2Deployment(
            execTarget,
            { repoUrl, branch, projectName, envVars, githubToken },
            onLog
        );

        onLog(`[ORCHESTRATOR] Container ${runResult.containerName} (${runResult.containerId}) started. Verifying HTTP ingress...`);

        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'VERIFYING',
        });

        // SAAS-07: HTTP ingress readiness probe
        const probeResult = await ec2HealthService.waitForAppReady(
            execTarget.publicIp,
            execTarget.hostPort,
            { onLog }
        );

        if (!probeResult.reachable) {
            onLog(`[ORCHESTRATOR] Health probe failed. Capturing container runtime logs...`);
            try {
                const runtimeLogs = await captureRuntimeLogs(execTarget, projectName, { tail: 50 });
                if (runtimeLogs) {
                    onLog(`[CONTAINER-LOGS] ${runtimeLogs}`);
                }
            } catch {
                // Non-blocking log capture
            }

            const errMsg = `Container started but HTTP health probe failed at ${probeResult.liveUrl} after ${probeResult.attempts} attempts.`;
            await streamer.flush();
            await deploymentsRepository.updateDeploymentStatus(deploymentId, {
                status: 'FAILED',
                errorMessage: errMsg,
                finishedAt: new Date().toISOString(),
            });
            streamer.emitter.emit('done', { status: 'FAILED', errorMessage: errMsg });
            return { status: 'FAILED', errorMessage: errMsg };
        }

        onLog(`[ORCHESTRATOR] Deployment SUCCEEDED! Live URL: ${probeResult.liveUrl}`);
        await streamer.flush();

        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'SUCCEEDED',
            serviceUrl: probeResult.liveUrl,
            finishedAt: new Date().toISOString(),
        });

        streamer.emitter.emit('done', { status: 'SUCCEEDED', serviceUrl: probeResult.liveUrl });
        return {
            status: 'SUCCEEDED',
            liveUrl: probeResult.liveUrl,
            containerId: runResult.containerId,
            containerName: runResult.containerName,
        };
    } catch (err) {
        const safeErr = redactSecrets(err.message || 'EC2 deployment failed', extraSecrets);
        onLog(`[ERROR] ${safeErr}`);
        await streamer.flush();

        await deploymentsRepository.updateDeploymentStatus(deploymentId, {
            status: 'FAILED',
            errorMessage: safeErr,
            finishedAt: new Date().toISOString(),
        });

        streamer.emitter.emit('done', { status: 'FAILED', errorMessage: safeErr });
        return { status: 'FAILED', errorMessage: safeErr };
    } finally {
        // Keep emitter briefly so late SSE clients receive 'done', then clean up
        setTimeout(() => cleanupEmitter(deploymentId), 15_000).unref?.();
    }
}

module.exports = {
    redactSecrets,
    getEmitter,
    createLogStreamer,
    captureRuntimeLogs,
    executeEc2Deployment,
};
