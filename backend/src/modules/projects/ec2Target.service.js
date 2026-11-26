const ApiError = require('../../utils/ApiError');
const { encryptSecret, decryptSecret } = require('../../utils/crypto.service');
const ec2TargetRepository = require('./ec2Target.repository');
const projectsService = require('./projects.service');
const sshClientService = require('../deployments/ssh-client.service');

/**
 * Strip all encrypted key fields and raw credentials before returning to any API caller.
 */
function sanitizeTarget(target) {
    if (!target) return null;

    return {
        id: target.id,
        projectId: target.project_id,
        publicIp: target.public_ip,
        sshUser: target.ssh_user,
        sshPort: target.ssh_port,
        authType: target.auth_type,
        dockerfilePath: target.dockerfile_path,
        awsRegion: target.aws_region,
        hostPort: target.host_port,
        containerPort: target.container_port,
        healthStatus: target.health_status,
        dockerVersion: target.docker_version,
        lastVerifiedAt: target.last_verified_at,
        hasSshKey: Boolean(target.encrypted_ssh_key),
        createdAt: target.created_at,
        updatedAt: target.updated_at,
    };
}

function normalizeDockerfilePath(rawPath = 'Dockerfile') {
    let clean = String(rawPath || 'Dockerfile').trim();
    if (clean.startsWith('./')) {
        clean = clean.slice(2);
    }
    return clean || 'Dockerfile';
}

/**
 * Save or update EC2 deployment target configuration for a project.
 * Encrypts the SSH private key using AES-256-GCM before persisting.
 */
async function saveEc2Config(projectId, user, payload) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'deploy'
    );

    const existing = await ec2TargetRepository.findByProjectId(projectId);
    const sshPrivateKey = payload.sshPrivateKey
        ? String(payload.sshPrivateKey).trim()
        : '';

    if (!existing && !sshPrivateKey) {
        throw new ApiError(400, 'SSH private key is required when configuring a new EC2 target');
    }

    let encryptedFields = {};
    if (sshPrivateKey) {
        const encrypted = encryptSecret(sshPrivateKey);
        encryptedFields = {
            encryptedSshKey: encrypted.ciphertext,
            sshKeyIv: encrypted.iv,
            sshKeyTag: encrypted.tag,
        };
    }

    const saved = await ec2TargetRepository.upsertEc2Target({
        projectId,
        userId: user.id,
        publicIp: String(payload.publicIp).trim(),
        sshUser: String(payload.sshUser || 'ubuntu').trim(),
        sshPort: Number(payload.sshPort || 22),
        authType: payload.authType || 'SSH_KEY',
        ...encryptedFields,
        dockerfilePath: normalizeDockerfilePath(payload.dockerfilePath),
        awsRegion: payload.awsRegion ? String(payload.awsRegion).trim() : 'us-east-1',
        hostPort: Number(payload.hostPort || 80),
        containerPort: Number(payload.containerPort || 3000),
    });

    return sanitizeTarget(saved);
}

/**
 * Retrieve sanitized EC2 target configuration for a project.
 */
async function getEc2Config(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'view'
    );

    const target = await ec2TargetRepository.findByProjectId(projectId);
    return sanitizeTarget(target);
}

/**
 * Internal execution-only helper: decrypts SSH private key in memory for SSH runner.
 * Never expose this output over HTTP.
 */
async function getDecryptedTargetForExecution(projectId) {
    const target = await ec2TargetRepository.findByProjectId(projectId);
    if (!target) {
        throw new ApiError(404, 'EC2 deployment target is not configured for this project');
    }

    const sshPrivateKey = decryptSecret({
        ciphertext: target.encrypted_ssh_key,
        iv: target.ssh_key_iv,
        tag: target.ssh_key_tag,
    });

    return {
        ...sanitizeTarget(target),
        sshPrivateKey,
    };
}

/**
 * SAAS-03 — Pre-flight SSH Connectivity & Security Group Probe.
 * Verifies SSH reachability, authentication, OS metadata, and Docker availability,
 * updating health_status in the database accordingly.
 */
async function verifyEc2Connection(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'deploy'
    );

    const execTarget = await getDecryptedTargetForExecution(projectId);

    try {
        const diagnostics = await sshClientService.probeHost({
            host: execTarget.publicIp,
            port: execTarget.sshPort,
            username: execTarget.sshUser,
            privateKey: execTarget.sshPrivateKey,
        });

        await ec2TargetRepository.updateHealthStatus(projectId, {
            healthStatus: 'ONLINE',
            dockerVersion: diagnostics.dockerVersion,
            lastVerifiedAt: new Date(),
        });

        return diagnostics;
    } catch (err) {
        const mappedStatus = err.healthStatus || 'UNREACHABLE';
        await ec2TargetRepository.updateHealthStatus(projectId, {
            healthStatus: mappedStatus,
            dockerVersion: null,
            lastVerifiedAt: new Date(),
        });

        const apiErr = new ApiError(err.statusCode || 400, err.message);
        apiErr.code = err.code || 'SSH_VERIFY_FAILED';
        throw apiErr;
    }
}

/**
 * Remove EC2 deployment target configuration for a project.
 */
async function deleteEc2Config(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role || user.platform_role,
        'deploy'
    );

    const res = await ec2TargetRepository.deleteByProjectId(projectId);
    return { projectId, deleted: res.count > 0 };
}

module.exports = {
    sanitizeTarget,
    saveEc2Config,
    getEc2Config,
    getDecryptedTargetForExecution,
    verifyEc2Connection,
    deleteEc2Config,
};
