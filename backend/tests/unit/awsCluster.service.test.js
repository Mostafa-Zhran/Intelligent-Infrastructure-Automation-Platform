const { describe, it, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.CREDENTIALS_ENCRYPTION_KEY =
    process.env.CREDENTIALS_ENCRYPTION_KEY || Buffer.alloc(32, 0x42).toString('base64');

const awsClusterRepository = require('../../src/modules/projects/awsCluster.repository');
const projectsService = require('../../src/modules/projects/projects.service');
const awsClusterService = require('../../src/modules/projects/awsCluster.service');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    buildAwsEnv,
    sanitizeK8sName,
    renderK8sManifests,
} = require('../../src/modules/deployments/byoc-cluster.orchestrator');

describe('BYOC Cluster Mode — awsClusterService & orchestrator', () => {
    beforeEach(() => {
        mock.restoreAll();
    });

    it('sanitizeClusterTarget masks accessKeyId and omits encrypted secret fields', () => {
        const sanitized = awsClusterService.sanitizeClusterTarget({
            id: 'cid-1',
            project_id: 'pid-1',
            auth_mode: 'ACCESS_KEYS',
            aws_region: 'us-east-1',
            role_arn: null,
            external_id: null,
            access_key_id: 'AKIAIOSFODNN7EXAMPLE',
            encrypted_secret_key: 'cipher',
            secret_key_iv: 'iv',
            secret_key_tag: 'tag',
            cluster_name: 'iiap-demo-eks',
            node_instance_type: 't3.medium',
            desired_nodes: 2,
            kubernetes_version: '1.30',
            cluster_endpoint: null,
            status: 'UNVERIFIED',
            last_verified_at: null,
            created_at: new Date(),
            updated_at: new Date(),
        });

        assert.equal(sanitized.hasSecretKey, true);
        assert.equal(sanitized.accessKeyId, 'AKIA****MPLE');
        assert.equal('encrypted_secret_key' in sanitized, false);
        assert.equal('secret_key_iv' in sanitized, false);
        assert.equal('secret_key_tag' in sanitized, false);
    });

    it('saveClusterConfig encrypts secretAccessKey in ACCESS_KEYS mode', async () => {
        mock.method(projectsService, 'verifyProjectAccess', async () => ({
            project: { id: 'pid-1', slug: 'demo-app', name: 'Demo App' },
            role: 'OWNER',
        }));
        mock.method(awsClusterRepository, 'findByProjectId', async () => null);

        let capturedUpsert = null;
        mock.method(awsClusterRepository, 'upsertClusterTarget', async (data) => {
            capturedUpsert = data;
            return {
                id: 'cid-1',
                project_id: data.projectId,
                auth_mode: data.authMode,
                aws_region: data.awsRegion,
                role_arn: null,
                external_id: null,
                access_key_id: data.accessKeyId,
                encrypted_secret_key: data.encryptedSecretKey,
                secret_key_iv: data.secretKeyIv,
                secret_key_tag: data.secretKeyTag,
                cluster_name: data.clusterName,
                node_instance_type: data.nodeInstanceType,
                desired_nodes: data.desiredNodes,
                kubernetes_version: data.kubernetesVersion,
                cluster_endpoint: null,
                status: 'UNVERIFIED',
                last_verified_at: null,
                created_at: new Date(),
                updated_at: new Date(),
            };
        });

        const res = await awsClusterService.saveClusterConfig(
            'pid-1',
            { id: 'uid-1', role: 'USER' },
            {
                authMode: 'ACCESS_KEYS',
                awsRegion: 'eu-west-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            }
        );

        assert.ok(capturedUpsert.encryptedSecretKey);
        assert.notEqual(capturedUpsert.encryptedSecretKey, 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
        assert.equal(res.clusterName, 'iiap-demo-app-eks');
        assert.equal(res.hasSecretKey, true);
    });

    it('verifyClusterCredentials rejects invalid IAM Role ARN and marks FAILED', async () => {
        mock.method(projectsService, 'verifyProjectAccess', async () => ({ role: 'OWNER' }));
        mock.method(awsClusterRepository, 'findByProjectId', async () => ({
            id: 'cid-1',
            project_id: 'pid-1',
            auth_mode: 'IAM_ROLE',
            aws_region: 'us-east-1',
            role_arn: 'invalid-arn',
            cluster_name: 'iiap-demo-eks',
            node_instance_type: 't3.medium',
            desired_nodes: 2,
            kubernetes_version: '1.30',
            status: 'UNVERIFIED',
        }));

        let statusUpdatedTo = null;
        mock.method(awsClusterRepository, 'updateClusterStatus', async (_pid, data) => {
            statusUpdatedTo = data.status;
            return {};
        });

        await assert.rejects(
            () => awsClusterService.verifyClusterCredentials('pid-1', { id: 'uid-1', role: 'USER' }),
            /Invalid AWS IAM Role ARN format/
        );
        assert.equal(statusUpdatedTo, 'FAILED');
    });

    it('buildAwsEnv maps IAM_ROLE and ACCESS_KEYS properly', () => {
        const roleEnv = buildAwsEnv({
            authMode: 'IAM_ROLE',
            awsRegion: 'us-west-2',
            roleArn: 'arn:aws:iam::123456789012:role/iiap-role',
            externalId: 'ext-1',
        });
        assert.equal(roleEnv.AWS_REGION, 'us-west-2');
        assert.equal(roleEnv.AWS_ROLE_ARN, 'arn:aws:iam::123456789012:role/iiap-role');
        assert.equal(roleEnv.AWS_EXTERNAL_ID, 'ext-1');

        const keyEnv = buildAwsEnv({
            authMode: 'ACCESS_KEYS',
            awsRegion: 'us-east-1',
            accessKeyId: 'AKIA123',
            secretAccessKey: 'SEC456',
        });
        assert.equal(keyEnv.AWS_ACCESS_KEY_ID, 'AKIA123');
        assert.equal(keyEnv.AWS_SECRET_ACCESS_KEY, 'SEC456');
    });

    it('sanitizeK8sName and renderK8sManifests generate isolated namespace, deployment, service, and secret', () => {
        const appName = sanitizeK8sName('My_Cool App!');
        assert.equal(appName, 'iiap-my-cool-app');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iiap-k8s-test-'));
        try {
            renderK8sManifests({
                appName,
                namespace: appName,
                imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/iiap-my-cool-app:latest',
                replicas: 3,
                containerPort: 8080,
                envVars: { NODE_ENV: 'production', API_KEY: 'secret-val' },
                outputDir: tmpDir,
            });

            const nsYaml = fs.readFileSync(path.join(tmpDir, 'namespace.yaml'), 'utf8');
            const deployYaml = fs.readFileSync(path.join(tmpDir, 'deployment.yaml'), 'utf8');
            const svcYaml = fs.readFileSync(path.join(tmpDir, 'service.yaml'), 'utf8');
            const secretYaml = fs.readFileSync(path.join(tmpDir, 'secret.yaml'), 'utf8');

            assert.match(nsYaml, /name: iiap-my-cool-app/);
            assert.match(deployYaml, /replicas: 3/);
            assert.match(deployYaml, /containerPort: 8080/);
            assert.match(deployYaml, /123456789012\.dkr\.ecr\.us-east-1\.amazonaws\.com/);
            assert.match(svcYaml, /type: LoadBalancer/);
            assert.match(secretYaml, /API_KEY: "secret-val"/);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
