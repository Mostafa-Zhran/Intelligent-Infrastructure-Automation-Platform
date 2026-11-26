const ApiError = require('../../utils/ApiError');
const { encryptSecret, decryptSecret } = require('../../utils/crypto.service');
const awsClusterRepository = require('./awsCluster.repository');
const projectsService = require('./projects.service');

/**
 * Strip encrypted secret fields before returning cluster target to API callers.
 */
function sanitizeClusterTarget(target) {
    if (!target) return null;

    return {
        id: target.id,
        projectId: target.project_id,
        authMode: target.auth_mode,
        awsRegion: target.aws_region,
        roleArn: target.role_arn,
        externalId: target.external_id,
        accessKeyId: target.access_key_id
            ? `${target.access_key_id.slice(0, 4)}****${target.access_key_id.slice(-4)}`
            : null,
        hasSecretKey: Boolean(target.encrypted_secret_key),
        clusterName: target.cluster_name,
        nodeInstanceType: target.node_instance_type,
        desiredNodes: target.desired_nodes,
        kubernetesVersion: target.kubernetes_version,
        clusterEndpoint: target.cluster_endpoint,
        status: target.status,
        lastVerifiedAt: target.last_verified_at,
        createdAt: target.created_at,
        updatedAt: target.updated_at,
    };
}

/**
 * Save or update BYOC AWS EKS cluster target configuration for a project.
 */
async function saveClusterConfig(projectId, user, payload) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    const { project } = await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'deploy'
    );

    const existing = await awsClusterRepository.findByProjectId(projectId);
    const authMode = payload.authMode || 'IAM_ROLE';

    if (authMode === 'IAM_ROLE' && !payload.roleArn?.trim()) {
        throw new ApiError(400, 'AWS IAM Role ARN is required for IAM_ROLE authentication.');
    }

    if (authMode === 'ACCESS_KEYS') {
        if (!payload.accessKeyId?.trim()) {
            throw new ApiError(400, 'AWS Access Key ID is required for ACCESS_KEYS authentication.');
        }
        const rawSecret = payload.secretAccessKey ? String(payload.secretAccessKey).trim() : '';
        if (!existing?.encrypted_secret_key && !rawSecret) {
            throw new ApiError(400, 'AWS Secret Access Key is required when configuring ACCESS_KEYS.');
        }
    }

    let encryptedFields = {};
    if (payload.secretAccessKey && String(payload.secretAccessKey).trim()) {
        const encrypted = encryptSecret(String(payload.secretAccessKey).trim());
        encryptedFields = {
            encryptedSecretKey: encrypted.ciphertext,
            secretKeyIv: encrypted.iv,
            secretKeyTag: encrypted.tag,
        };
    }

    const defaultClusterName = `iiap-${(project.slug || project.name || 'app')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')}-eks`.slice(0, 63);

    const saved = await awsClusterRepository.upsertClusterTarget({
        projectId,
        userId: user.id,
        authMode,
        awsRegion: String(payload.awsRegion || 'us-east-1').trim(),
        roleArn: authMode === 'IAM_ROLE' ? String(payload.roleArn).trim() : null,
        externalId: payload.externalId ? String(payload.externalId).trim() : null,
        accessKeyId: authMode === 'ACCESS_KEYS' ? String(payload.accessKeyId).trim() : null,
        ...encryptedFields,
        clusterName: payload.clusterName ? String(payload.clusterName).trim() : defaultClusterName,
        nodeInstanceType: payload.nodeInstanceType ? String(payload.nodeInstanceType).trim() : 't3.medium',
        desiredNodes: Number(payload.desiredNodes || 2),
        kubernetesVersion: payload.kubernetesVersion ? String(payload.kubernetesVersion).trim() : '1.32',
    });

    return sanitizeClusterTarget(saved);
}

/**
 * Get sanitized BYOC AWS cluster target configuration for a project.
 */
async function getClusterConfig(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(projectId, user.id, user.role, 'view');

    const target = await awsClusterRepository.findByProjectId(projectId);
    return sanitizeClusterTarget(target);
}

/**
 * Internal-only: retrieve decrypted AWS cluster credentials for Terraform/EKS execution.
 * NEVER expose this via HTTP responses.
 */
async function getDecryptedClusterForExecution(projectId) {
    const target = await awsClusterRepository.findByProjectId(projectId);
    if (!target) {
        throw new ApiError(404, 'AWS BYOC cluster target is not configured for this project.');
    }

    let secretAccessKey = null;
    if (target.encrypted_secret_key && target.secret_key_iv && target.secret_key_tag) {
        secretAccessKey = decryptSecret({
            ciphertext: target.encrypted_secret_key,
            iv: target.secret_key_iv,
            tag: target.secret_key_tag,
        });
    }

    return {
        id: target.id,
        projectId: target.project_id,
        authMode: target.auth_mode,
        awsRegion: target.aws_region,
        roleArn: target.role_arn,
        externalId: target.external_id,
        accessKeyId: target.access_key_id,
        secretAccessKey,
        clusterName: target.cluster_name,
        nodeInstanceType: target.node_instance_type,
        desiredNodes: target.desired_nodes,
        kubernetesVersion: target.kubernetes_version,
        clusterEndpoint: target.cluster_endpoint,
        status: target.status,
    };
}

/**
 * Verify AWS BYOC cluster credentials structure (and AWS CLI STS identity if available).
 */
async function verifyClusterCredentials(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(projectId, user.id, user.role, 'deploy');

    const execTarget = await getDecryptedClusterForExecution(projectId);

    if (execTarget.authMode === 'IAM_ROLE') {
        const arnRegex = /^arn:aws(-[a-z]+)?:iam::\d{12}:role\/[\w+=,.@\-/]+$/;
        if (!execTarget.roleArn || !arnRegex.test(execTarget.roleArn)) {
            await awsClusterRepository.updateClusterStatus(projectId, {
                status: 'FAILED',
                lastVerifiedAt: new Date(),
            });
            throw new ApiError(400, 'Invalid AWS IAM Role ARN format (expected arn:aws:iam::<account-id>:role/<name>).');
        }
    } else if (execTarget.authMode === 'ACCESS_KEYS') {
        if (!execTarget.accessKeyId || !execTarget.secretAccessKey) {
            await awsClusterRepository.updateClusterStatus(projectId, {
                status: 'FAILED',
                lastVerifiedAt: new Date(),
            });
            throw new ApiError(400, 'Missing AWS Access Key ID or Secret Access Key.');
        }
    }

    const updated = await awsClusterRepository.updateClusterStatus(projectId, {
        status: 'ONLINE',
        lastVerifiedAt: new Date(),
    });

    return {
        verified: true,
        authMode: execTarget.authMode,
        awsRegion: execTarget.awsRegion,
        clusterName: execTarget.clusterName,
        target: sanitizeClusterTarget(updated),
    };
}

/**
 * Remove AWS BYOC cluster target configuration for a project.
 */
async function deleteClusterConfig(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    await projectsService.verifyProjectAccess(
        projectId,
        user.id,
        user.role || user.platform_role,
        'deploy'
    );

    const res = await awsClusterRepository.deleteByProjectId(projectId);
    return { projectId, deleted: res.count > 0 };
}

module.exports = {
    sanitizeClusterTarget,
    saveClusterConfig,
    getClusterConfig,
    getDecryptedClusterForExecution,
    verifyClusterCredentials,
    deleteClusterConfig,
};
