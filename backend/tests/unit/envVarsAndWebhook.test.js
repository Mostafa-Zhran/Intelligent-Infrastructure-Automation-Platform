// backend/tests/unit/envVarsAndWebhook.test.js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Ensure valid 32-byte encryption key for tests
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 0x42).toString('base64');

const envVarsRepository = require('../../src/modules/projects/envVars.repository');
const envVarsService = require('../../src/modules/projects/envVars.service');
const webhookService = require('../../src/modules/integrations/github/github.webhook.service');

describe('envVarsService', () => {
    let store;

    beforeEach(() => {
        store = new Map();
        envVarsRepository.upsertEnvVar = async (projectId, data) => {
            store.set(`${projectId}:${data.key}`, { id: 'var-1', project_id: projectId, ...data });
            return store.get(`${projectId}:${data.key}`);
        };
        envVarsRepository.findAllWithSecrets = async (projectId) => {
            return Array.from(store.values()).filter((v) => v.project_id === projectId);
        };
        envVarsRepository.deleteEnvVar = async (projectId, key) => {
            const existed = store.delete(`${projectId}:${key}`);
            return { count: existed ? 1 : 0 };
        };
    });

    it('rejects invalid env var keys', async () => {
        await assert.rejects(
            () => envVarsService.saveEnvVar('proj-1', { key: 'invalid-key', value: '123' }),
            (err) => err.statusCode === 400
        );
    });

    it('encrypts env var at rest and decrypts accurately for execution', async () => {
        await envVarsService.saveEnvVar('proj-1', {
            key: 'DATABASE_URL',
            value: 'postgres://user:pass@localhost:5432/db',
            isSecret: true,
        });

        const rawRecord = store.get('proj-1:DATABASE_URL');
        assert.ok(rawRecord.ciphertext);
        assert.notEqual(rawRecord.ciphertext, 'postgres://user:pass@localhost:5432/db');

        const map = await envVarsService.getDecryptedEnvMap('proj-1');
        assert.equal(map.DATABASE_URL, 'postgres://user:pass@localhost:5432/db');
    });

    it('throws 404 when deleting a missing env var', async () => {
        await assert.rejects(
            () => envVarsService.deleteEnvVar('proj-1', 'MISSING_KEY'),
            (err) => err.statusCode === 404
        );
    });
});

describe('github.webhook.service', () => {
    it('verifies valid HMAC-SHA256 signature and rejects tampered payload', () => {
        const secret = 'super-webhook-secret';
        const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }));
        const validSig = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

        assert.equal(webhookService.verifySignature(body, validSig, secret), true);
        assert.equal(webhookService.verifySignature(body, 'sha256=deadbeef', secret), false);
        assert.equal(webhookService.verifySignature(body, '', secret), false);
    });
});
