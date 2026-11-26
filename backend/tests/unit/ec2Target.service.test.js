const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const crypto = require('crypto');

// Ensure deterministic 32-byte key in test env
if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
    process.env.CREDENTIALS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
}

const cryptoService = require('../../src/utils/crypto.service');
const ec2TargetService = require('../../src/modules/projects/ec2Target.service');
const ec2TargetRepository = require('../../src/modules/projects/ec2Target.repository');
const projectsService = require('../../src/modules/projects/projects.service');
const sshClientService = require('../../src/modules/deployments/ssh-client.service');

describe('SAAS-02 — Encrypted EC2 Credentials & Target Configuration', () => {
    const sampleSshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmU=\n-----END OPENSSH PRIVATE KEY-----';
    const testUser = { id: 'user-uuid-123', role: 'USER' };
    const testProjectId = 'proj-uuid-456';

    afterEach(() => {
        mock.restoreAll();
    });

    it('TEST-EC2-02: should encrypt and decrypt SSH private key accurately with AES-256-GCM', () => {
        const encrypted = cryptoService.encryptSecret(sampleSshKey);

        assert.ok(encrypted.ciphertext);
        assert.ok(encrypted.iv);
        assert.ok(encrypted.tag);
        assert.notEqual(encrypted.ciphertext, sampleSshKey);

        const decrypted = cryptoService.decryptSecret(encrypted);
        assert.equal(decrypted, sampleSshKey);
    });

    it('TEST-EC2-02: should reject tampered ciphertext or auth tag', () => {
        const encrypted = cryptoService.encryptSecret(sampleSshKey);
        const tampered = {
            ...encrypted,
            tag: crypto.randomBytes(16).toString('base64'),
        };

        assert.throws(() => cryptoService.decryptSecret(tampered));
    });

    it('saveEc2Config should encrypt SSH key before saving and strictly omit raw key from response', async () => {
        mock.method(projectsService, 'verifyProjectAccess', async () => ({
            project: { id: testProjectId },
        }));
        mock.method(ec2TargetRepository, 'findByProjectId', async () => null);

        let capturedRepoArg = null;
        mock.method(ec2TargetRepository, 'upsertEc2Target', async (data) => {
            capturedRepoArg = data;
            return {
                id: 'target-uuid-789',
                project_id: data.projectId,
                user_id: data.userId,
                public_ip: data.publicIp,
                ssh_user: data.sshUser,
                ssh_port: data.sshPort,
                auth_type: data.authType,
                encrypted_ssh_key: data.encryptedSshKey,
                ssh_key_iv: data.sshKeyIv,
                ssh_key_tag: data.sshKeyTag,
                dockerfile_path: data.dockerfilePath,
                aws_region: data.awsRegion,
                host_port: data.hostPort,
                container_port: data.containerPort,
                health_status: 'UNVERIFIED',
                docker_version: null,
                last_verified_at: null,
                created_at: new Date(),
                updated_at: new Date(),
            };
        });

        const result = await ec2TargetService.saveEc2Config(testProjectId, testUser, {
            publicIp: '54.210.120.45',
            sshUser: 'ubuntu',
            sshPort: 22,
            sshPrivateKey: sampleSshKey,
            dockerfilePath: './backend/Dockerfile',
            hostPort: 80,
            containerPort: 3000,
        });

        // Verify stored key was encrypted
        assert.ok(capturedRepoArg.encryptedSshKey);
        assert.notEqual(capturedRepoArg.encryptedSshKey, sampleSshKey);
        assert.equal(capturedRepoArg.dockerfilePath, 'backend/Dockerfile');

        // Verify response DTO is sanitized
        assert.equal(result.publicIp, '54.210.120.45');
        assert.equal(result.hasSshKey, true);
        assert.equal(result.encrypted_ssh_key, undefined);
        assert.equal(result.ssh_key_iv, undefined);
        assert.equal(result.ssh_key_tag, undefined);
        assert.equal(result.sshPrivateKey, undefined);
    });

    it('getDecryptedTargetForExecution should recover exact SSH key in memory', async () => {
        const encrypted = cryptoService.encryptSecret(sampleSshKey);
        mock.method(ec2TargetRepository, 'findByProjectId', async () => ({
            id: 'target-uuid-789',
            project_id: testProjectId,
            public_ip: '54.210.120.45',
            ssh_user: 'ubuntu',
            ssh_port: 22,
            auth_type: 'SSH_KEY',
            encrypted_ssh_key: encrypted.ciphertext,
            ssh_key_iv: encrypted.iv,
            ssh_key_tag: encrypted.tag,
            dockerfile_path: 'Dockerfile',
            host_port: 80,
            container_port: 3000,
            health_status: 'ONLINE',
        }));

        const execTarget = await ec2TargetService.getDecryptedTargetForExecution(testProjectId);
        assert.equal(execTarget.sshPrivateKey, sampleSshKey);
        assert.equal(execTarget.publicIp, '54.210.120.45');
    });

    it('TEST-EC2-03: verifyEc2Connection should probe SSH host and update health status to ONLINE', async () => {
        const encrypted = cryptoService.encryptSecret(sampleSshKey);
        mock.method(projectsService, 'verifyProjectAccess', async () => ({
            project: { id: testProjectId },
        }));
        mock.method(ec2TargetRepository, 'findByProjectId', async () => ({
            id: 'target-uuid-789',
            project_id: testProjectId,
            public_ip: '54.210.120.45',
            ssh_user: 'ubuntu',
            ssh_port: 22,
            auth_type: 'SSH_KEY',
            encrypted_ssh_key: encrypted.ciphertext,
            ssh_key_iv: encrypted.iv,
            ssh_key_tag: encrypted.tag,
            dockerfile_path: 'Dockerfile',
            host_port: 80,
            container_port: 3000,
            health_status: 'UNVERIFIED',
        }));

        mock.method(sshClientService, 'probeHost', async () => ({
            reachable: true,
            portOpen: true,
            authenticated: true,
            osInfo: 'Ubuntu 22.04.3 LTS',
            dockerInstalled: true,
            dockerVersion: 'Docker version 26.1.3',
            canRunDockerWithoutSudo: true,
            hasSudoAccess: true,
        }));

        let capturedStatusUpdate = null;
        mock.method(ec2TargetRepository, 'updateHealthStatus', async (pid, data) => {
            capturedStatusUpdate = { pid, ...data };
            return {};
        });

        const diagnostics = await ec2TargetService.verifyEc2Connection(testProjectId, testUser);

        assert.equal(diagnostics.reachable, true);
        assert.equal(diagnostics.dockerInstalled, true);
        assert.equal(capturedStatusUpdate.healthStatus, 'ONLINE');
        assert.equal(capturedStatusUpdate.dockerVersion, 'Docker version 26.1.3');
    });

    it('TEST-EC2-03: verifyEc2Connection should classify SSH timeout and mark host UNREACHABLE', async () => {
        const encrypted = cryptoService.encryptSecret(sampleSshKey);
        mock.method(projectsService, 'verifyProjectAccess', async () => ({
            project: { id: testProjectId },
        }));
        mock.method(ec2TargetRepository, 'findByProjectId', async () => ({
            id: 'target-uuid-789',
            project_id: testProjectId,
            public_ip: '54.210.120.45',
            ssh_user: 'ubuntu',
            ssh_port: 22,
            encrypted_ssh_key: encrypted.ciphertext,
            ssh_key_iv: encrypted.iv,
            ssh_key_tag: encrypted.tag,
        }));

        mock.method(sshClientService, 'probeHost', async () => {
            const err = new Error('Connection to 54.210.120.45:22 timed out.');
            err.code = 'SSH_CONNECTION_TIMEOUT';
            err.healthStatus = 'UNREACHABLE';
            err.statusCode = 400;
            throw err;
        });

        let capturedStatusUpdate = null;
        mock.method(ec2TargetRepository, 'updateHealthStatus', async (pid, data) => {
            capturedStatusUpdate = data;
            return {};
        });

        await assert.rejects(
            ec2TargetService.verifyEc2Connection(testProjectId, testUser),
            (err) => err.code === 'SSH_CONNECTION_TIMEOUT' && err.statusCode === 400
        );
        assert.equal(capturedStatusUpdate.healthStatus, 'UNREACHABLE');
    });
});
