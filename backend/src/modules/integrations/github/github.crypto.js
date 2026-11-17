// backend/src/modules/integrations/github/github.crypto.js
const crypto = require('crypto');
require('dotenv').config();
const ApiError = require('../../../utils/ApiError');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_VERSION = 1;

function getKey() {
    const raw = (process.env.GITHUB_TOKEN_ENCRYPTION_KEY || '').trim();
    if (!raw) {
        throw new ApiError(500, 'GITHUB_TOKEN_ENCRYPTION_KEY is not configured in Railway Variables');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new ApiError(500, 'GITHUB_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64)');
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
