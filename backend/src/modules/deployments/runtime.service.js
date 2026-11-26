// backend/src/modules/deployments/runtime.service.js
// Runtime container controls: fetch docker logs, status, and restart container via SSH.
const sshClientService = require('./ssh-client.service');
const ec2TargetService = require('../projects/ec2Target.service');
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');

const COMMAND_TIMEOUT_MS = 20_000;

/**
 * Resolves the canonical Docker container name for a project,
 * matching ec2-runner.service.js (`iiap-<sanitized-slug-or-name>`).
 */
async function resolveContainerName(projectId) {
    const project = await prisma.projects.findUnique({
        where: { id: projectId },
        select: { slug: true, name: true },
    });
    if (!project) throw new ApiError(404, 'Project not found');
    const baseName = (project.slug || project.name || projectId.slice(0, 8))
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
    return `iiap-${baseName}`;
}

/**
 * Runs a command on the EC2 host via SSH, retrying with sudo on permission denied.
 */
async function runRemote(conn, command, timeoutMs = COMMAND_TIMEOUT_MS) {
    const result = await sshClientService.execCommand(conn, command, { timeoutMs });
    const combined = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
    if (result.exitCode !== 0 && combined.includes('permission denied')) {
        console.warn(`[Runtime] Retrying with sudo: ${command}`);
        return sshClientService.execCommand(conn, `sudo ${command}`, { timeoutMs });
    }
    return result;
}

function toSshConfig(target) {
    return {
        host: target.publicIp,
        port: target.sshPort,
        username: target.sshUser,
        privateKey: target.sshPrivateKey,
    };
}

/**
 * Fetches the last N lines of docker logs for the container running in a project.
 */
async function getContainerLogs(projectId, { tail = 200 } = {}) {
    const target = await ec2TargetService.getDecryptedTargetForExecution(projectId);
    const containerName = await resolveContainerName(projectId);

    return sshClientService.withSshConnection(toSshConfig(target), async (conn) => {
        const result = await runRemote(
            conn,
            `docker logs --tail=${Number(tail)} --timestamps ${containerName} 2>&1`
        );

        if (result.exitCode !== 0) {
            const msg = `${result.stdout || ''}${result.stderr || ''}`.trim();
            throw new ApiError(
                404,
                msg.includes('No such container')
                    ? `Container "${containerName}" not found on EC2 host. Deploy the project first.`
                    : `docker logs failed: ${msg.slice(0, 200)}`
            );
        }

        const lines = (result.stdout || '')
            .split('\n')
            .filter(Boolean)
            .map((line) => line.trimEnd());

        return { containerName, lines };
    });
}

/**
 * Restarts the container for a project using `docker restart`.
 */
async function restartContainer(projectId) {
    const target = await ec2TargetService.getDecryptedTargetForExecution(projectId);
    const containerName = await resolveContainerName(projectId);

    return sshClientService.withSshConnection(toSshConfig(target), async (conn) => {
        const result = await runRemote(conn, `docker restart ${containerName}`);

        if (result.exitCode !== 0) {
            const msg = `${result.stdout || ''}${result.stderr || ''}`.trim();
            throw new ApiError(
                400,
                msg.includes('No such container')
                    ? `Container "${containerName}" not found. Deploy the project first.`
                    : `docker restart failed: ${msg.slice(0, 200)}`
            );
        }

        console.info(`[Runtime] Container "${containerName}" restarted successfully`);
        return { containerName, restarted: true };
    });
}

/**
 * Returns live container status info (running, image, ports, startedAt).
 */
async function getContainerStatus(projectId) {
    const target = await ec2TargetService.getDecryptedTargetForExecution(projectId);
    const containerName = await resolveContainerName(projectId);

    return sshClientService.withSshConnection(toSshConfig(target), async (conn) => {
        const result = await runRemote(
            conn,
            `docker inspect --format '{{.State.Status}}|{{.State.StartedAt}}|{{.Config.Image}}|{{range $p,$conf := .NetworkSettings.Ports}}{{$p}}->{{if $conf}}{{(index $conf 0).HostPort}}{{end}} {{end}}' ${containerName} 2>&1`
        );

        if (result.exitCode !== 0 || (result.stdout || '').includes('No such')) {
            return {
                containerName,
                running: false,
                status: 'not_found',
                image: null,
                startedAt: null,
                ports: null,
            };
        }

        const [status, startedAt, image, ports] = (result.stdout || '').trim().split('|');
        return {
            containerName,
            running: status?.trim() === 'running',
            status: status?.trim() || 'unknown',
            image: image?.trim() || null,
            startedAt: startedAt?.trim() || null,
            ports: ports?.trim() || null,
        };
    });
}

module.exports = { getContainerLogs, restartContainer, getContainerStatus };
