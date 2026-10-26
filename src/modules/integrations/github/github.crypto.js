// backend/src/modules/integrations/github/github.crypto.js
// تشفير وفك تشفير توكن GitHub باستخدام AES-256-GCM
const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_VERSION = 1;

function getKey() {
    const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY is not configured');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
    }
    return key;
}

function encryptToken(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyVersion: KEY_VERSION,
    };
}

function decryptToken({ ciphertext, iv, tag }) {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

module.exports = { encryptToken, decryptToken };