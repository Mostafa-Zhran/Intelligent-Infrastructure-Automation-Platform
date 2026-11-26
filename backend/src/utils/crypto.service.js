const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_VERSION = 1;

function getMasterKey() {
    const raw =
        process.env.CREDENTIALS_ENCRYPTION_KEY ||
        process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

    if (!raw) {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY is not configured');
    }

    const key = Buffer.from(raw.trim(), 'base64');
    if (key.length !== 32) {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes (256-bit)');
    }

    return key;
}

/**
 * Encrypt sensitive credential string (e.g. SSH private key, AWS secret key)
 * using AES-256-GCM authenticated encryption.
 */
function encryptSecret(plaintext) {
    if (typeof plaintext !== 'string' || !plaintext.length) {
        throw new Error('Plaintext secret must be a non-empty string');
    }

    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyVersion: KEY_VERSION,
    };
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 */
function decryptSecret({ ciphertext, iv, tag }) {
    if (!ciphertext || !iv || !tag) {
        throw new Error('Missing ciphertext, iv, or authentication tag for decryption');
    }

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

module.exports = {
    encryptSecret,
    decryptSecret,
};
