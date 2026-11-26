const prisma = require('../../db/prisma');

/**
 * Create or update the EC2 deployment target configuration for a project.
 */
async function upsertEc2Target({
    projectId,
    userId,
    publicIp,
    sshUser = 'ubuntu',
    sshPort = 22,
    authType = 'SSH_KEY',
    encryptedSshKey,
    sshKeyIv,
    sshKeyTag,
    dockerfilePath = 'Dockerfile',
    awsRegion = 'us-east-1',
    hostPort = 80,
    containerPort = 3000,
}) {
    return prisma.ec2_deploy_targets.upsert({
        where: { project_id: projectId },
        create: {
            project_id: projectId,
            user_id: userId,
            public_ip: publicIp,
            ssh_user: sshUser,
            ssh_port: sshPort,
            auth_type: authType,
            encrypted_ssh_key: encryptedSshKey,
            ssh_key_iv: sshKeyIv,
            ssh_key_tag: sshKeyTag,
            dockerfile_path: dockerfilePath,
            aws_region: awsRegion,
            host_port: hostPort,
            container_port: containerPort,
            health_status: 'UNVERIFIED',
        },
        update: {
            user_id: userId,
            public_ip: publicIp,
            ssh_user: sshUser,
            ssh_port: sshPort,
            auth_type: authType,
            ...(encryptedSshKey
                ? {
                      encrypted_ssh_key: encryptedSshKey,
                      ssh_key_iv: sshKeyIv,
                      ssh_key_tag: sshKeyTag,
                  }
                : {}),
            dockerfile_path: dockerfilePath,
            aws_region: awsRegion,
            host_port: hostPort,
            container_port: containerPort,
            health_status: 'UNVERIFIED',
        },
    });
}

async function findByProjectId(projectId) {
    return prisma.ec2_deploy_targets.findUnique({
        where: { project_id: projectId },
    });
}

async function updateHealthStatus(
    projectId,
    { healthStatus, dockerVersion = null, lastVerifiedAt = new Date() }
) {
    return prisma.ec2_deploy_targets.update({
        where: { project_id: projectId },
        data: {
            health_status: healthStatus,
            docker_version: dockerVersion,
            last_verified_at: lastVerifiedAt,
        },
    });
}

async function deleteByProjectId(projectId) {
    return prisma.ec2_deploy_targets.delete({
        where: { project_id: projectId },
    });
}

module.exports = {
    upsertEc2Target,
    findByProjectId,
    updateHealthStatus,
    deleteByProjectId,
};
