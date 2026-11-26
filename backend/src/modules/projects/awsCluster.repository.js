const prisma = require('../../db/prisma');

/**
 * Find AWS BYOC cluster target configuration for a project.
 * @param {string} projectId
 */
async function findByProjectId(projectId) {
    return prisma.aws_cluster_targets.findUnique({
        where: { project_id: projectId },
    });
}

/**
 * Create or update the AWS BYOC cluster target for a project.
 */
async function upsertClusterTarget({
    projectId,
    userId,
    authMode,
    awsRegion,
    roleArn,
    externalId,
    accessKeyId,
    encryptedSecretKey,
    secretKeyIv,
    secretKeyTag,
    clusterName,
    nodeInstanceType,
    desiredNodes,
    kubernetesVersion,
}) {
    const updatePayload = {
        user_id: userId,
        auth_mode: authMode,
        aws_region: awsRegion,
        role_arn: roleArn ?? null,
        external_id: externalId ?? null,
        access_key_id: accessKeyId ?? null,
        cluster_name: clusterName,
        node_instance_type: nodeInstanceType,
        desired_nodes: desiredNodes,
        kubernetes_version: kubernetesVersion,
        status: 'UNVERIFIED',
        updated_at: new Date(),
    };

    if (encryptedSecretKey && secretKeyIv && secretKeyTag) {
        updatePayload.encrypted_secret_key = encryptedSecretKey;
        updatePayload.secret_key_iv = secretKeyIv;
        updatePayload.secret_key_tag = secretKeyTag;
    }

    return prisma.aws_cluster_targets.upsert({
        where: { project_id: projectId },
        update: updatePayload,
        create: {
            project_id: projectId,
            user_id: userId,
            auth_mode: authMode || 'IAM_ROLE',
            aws_region: awsRegion || 'us-east-1',
            role_arn: roleArn ?? null,
            external_id: externalId ?? null,
            access_key_id: accessKeyId ?? null,
            encrypted_secret_key: encryptedSecretKey ?? null,
            secret_key_iv: secretKeyIv ?? null,
            secret_key_tag: secretKeyTag ?? null,
            cluster_name: clusterName,
            node_instance_type: nodeInstanceType || 't3.medium',
            desired_nodes: desiredNodes || 2,
            kubernetes_version: kubernetesVersion || '1.30',
            status: 'UNVERIFIED',
        },
    });
}

/**
 * Update cluster provisioning/verification status.
 */
async function updateClusterStatus(projectId, { status, clusterEndpoint, lastVerifiedAt }) {
    return prisma.aws_cluster_targets.update({
        where: { project_id: projectId },
        data: {
            status,
            ...(clusterEndpoint !== undefined ? { cluster_endpoint: clusterEndpoint } : {}),
            ...(lastVerifiedAt ? { last_verified_at: lastVerifiedAt } : {}),
            updated_at: new Date(),
        },
    });
}

/**
 * Delete AWS BYOC cluster target for a project.
 */
async function deleteByProjectId(projectId) {
    return prisma.aws_cluster_targets.deleteMany({
        where: { project_id: projectId },
    });
}

module.exports = {
    findByProjectId,
    upsertClusterTarget,
    updateClusterStatus,
    deleteByProjectId,
};
