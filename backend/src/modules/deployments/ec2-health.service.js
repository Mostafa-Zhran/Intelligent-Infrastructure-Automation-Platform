// backend/src/modules/deployments/ec2-health.service.js
// SAAS-07 — HTTP Ingress Readiness Probe after container starts
'use strict';

const http = require('http');
const https = require('https');

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 3000;
const DEFAULT_PROBE_TIMEOUT_MS = 5000;

/**
 * Perform a single HTTP GET probe against a live URL.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ ok: boolean, statusCode: number|null, error: string|null }>}
 */
function probeHttpEndpoint(url, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const lib = url.startsWith('https://') ? https : http;
        let settled = false;

        const req = lib.get(url, { timeout: timeoutMs }, (res) => {
            if (!settled) {
                settled = true;
                // Drain response body to free socket
                res.resume();
                const ok = res.statusCode >= 200 && res.statusCode < 400;
                resolve({ ok, statusCode: res.statusCode, error: null });
            }
        });

        req.on('timeout', () => {
            if (!settled) {
                settled = true;
                req.destroy();
                resolve({ ok: false, statusCode: null, error: `Probe timed out after ${timeoutMs}ms` });
            }
        });

        req.on('error', (err) => {
            if (!settled) {
                settled = true;
                resolve({ ok: false, statusCode: null, error: err.message });
            }
        });
    });
}

/**
 * Wait for the application to become reachable via HTTP.
 * Retries up to `maxRetries` times with `retryDelayMs` between attempts.
 *
 * @param {string} publicIp
 * @param {number} hostPort
 * @param {object} [options]
 * @param {number} [options.maxRetries=5]
 * @param {number} [options.retryDelayMs=3000]
 * @param {number} [options.probeTimeoutMs=5000]
 * @param {function} [options.onLog]
 * @returns {Promise<{ reachable: boolean, liveUrl: string, statusCode: number|null, attempts: number }>}
 */
async function waitForAppReady(publicIp, hostPort, {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    probeTimeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
    onLog = () => {},
} = {}) {
    const liveUrl = `http://${publicIp}:${hostPort}`;
    const log = (msg) => onLog(`[HEALTH-PROBE] ${msg}`);

    log(`Waiting for app at ${liveUrl} to become reachable...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        log(`Attempt ${attempt}/${maxRetries}: GET ${liveUrl}`);

        const result = await probeHttpEndpoint(liveUrl, probeTimeoutMs);

        if (result.ok) {
            log(`Application is reachable! HTTP ${result.statusCode}`);
            return { reachable: true, liveUrl, statusCode: result.statusCode, attempts: attempt };
        }

        log(`Not ready yet: ${result.error || `HTTP ${result.statusCode}`}`);

        if (attempt < maxRetries) {
            log(`Waiting ${retryDelayMs}ms before next attempt...`);
            await new Promise((r) => setTimeout(r, retryDelayMs));
        }
    }

    log(`Application did not become reachable after ${maxRetries} attempts.`);
    return { reachable: false, liveUrl, statusCode: null, attempts: maxRetries };
}

module.exports = {
    probeHttpEndpoint,
    waitForAppReady,
};
