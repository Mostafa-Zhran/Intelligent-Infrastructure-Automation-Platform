// backend/tests/unit/ec2Runner.service.test.js
// Unit tests for SAAS-04 (Docker Bootstrap), SAAS-05 (Container Lifecycle),
// SAAS-06 (Log Streaming & Secret Redaction), and SAAS-07 (HTTP Health Probe).
'use strict';

const { describe, it, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { EventEmitter } = require('events');

const ec2RunnerService = require('../../src/modules/deployments/ec2-runner.service');
const ec2HealthService = require('../../src/modules/deployments/ec2-health.service');
const ec2Orchestrator = require('../../src/modules/deployments/ec2-deployment.orchestrator');
const deploymentsRepository = require('../../src/modules/deployments/deployments.repository');

/**
 * Helper to create a mock ssh2 connection whose `conn.exec` returns scripted outputs.
 */
function makeMockConn(scriptedResponses) {
    let idx = 0;
    const commands = [];
    const conn = {
        exec(cmd, cb) {
            commands.push(cmd);
            const resp = scriptedResponses[idx++] || { stdout: '', stderr: '', exitCode: 0 };
            const stream = new EventEmitter();
            stream.stderr = new EventEmitter();
            cb(null, stream);
            process.nextTick(() => {
                if (resp.stdout) stream.emit('data', Buffer.from(resp.stdout));
                if (resp.stderr) stream.stderr.emit('data', Buffer.from(resp.stderr));
                stream.emit('close', resp.exitCode ?? 0);
            });
        },
    };
    return { conn, commands };
}

describe('SAAS-04 to SAAS-07: EC2 Runner, Log Streaming & Health Probe', () => {
    afterEach(() => {
        mock.restoreAll();
    });

    // ─── TEST-EC2-04: Docker Bootstrap Idempotency ────────────────────────────
    describe('TEST-EC2-04: bootstrapDockerOnEc2', () => {
        it('skips installation when Docker is already installed and daemon is running', async () => {
            const { conn, commands } = makeMockConn([
                { stdout: '/usr/bin/docker\nDocker version 26.1.3\n', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
            ]);

            const logs = [];
            await ec2RunnerService.bootstrapDockerOnEc2(conn, { sshUser: 'ubuntu' }, (l) => logs.push(l));

            assert.equal(commands.length, 3);
            assert.equal(commands.some((c) => c.includes('get.docker.com')), false);
            assert.equal(logs.some((l) => l.includes('already installed')), true);
        });

        it('installs Docker via get.docker.com when missing', async () => {
            const { conn, commands } = makeMockConn([
                { stdout: 'DOCKER_MISSING\n', stderr: '', exitCode: 0 },
                { stdout: 'Installed', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
            ]);

            const logs = [];
            await ec2RunnerService.bootstrapDockerOnEc2(conn, { sshUser: 'ubuntu' }, (l) => logs.push(l));

            assert.equal(commands.length, 4);
            assert.ok(commands[1].includes('get.docker.com'));
            assert.equal(logs.some((l) => l.includes('Docker installed successfully')), true);
        });
    });

    // ─── TEST-EC2-05: Container Lifecycle & Port Conflict ─────────────────────
    describe('TEST-EC2-05: runContainer', () => {
        it('stops/removes old container and starts new one returning containerId', async () => {
            const { conn } = makeMockConn([
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: 'abc123def4567890\n', stderr: '', exitCode: 0 },
            ]);

            const res = await ec2RunnerService.runContainer(conn, 'proj-1', 'My App', 80, 3000);
            assert.equal(res.containerName, 'iiap-my-app');
            assert.equal(res.containerId, 'abc123def456');
        });

        it('captures container logs and throws CONTAINER_START_FAILED on port conflict', async () => {
            const { conn } = makeMockConn([
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: '', stderr: '', exitCode: 0 },
                { stdout: '', stderr: 'port is already allocated', exitCode: 125 },
                { stdout: 'Error: listen EADDRINUSE', stderr: '', exitCode: 0 },
            ]);

            const logs = [];
            await assert.rejects(
                () => ec2RunnerService.runContainer(conn, 'proj-1', 'My App', 80, 3000, (l) => logs.push(l)),
                /Failed to start container/
            );

            assert.equal(logs.some((l) => l.includes('EADDRINUSE')), true);
        });
    });

    // ─── TEST-EC2-06: Live Log Streaming & Secret Redaction ───────────────────
    describe('TEST-EC2-06: createLogStreamer', () => {
        it('redacts sensitive tokens, passwords, and custom secret values before emitting & saving', async () => {
            let saveCalls = 0;
            mock.method(deploymentsRepository, 'saveDeploymentLogs', async () => {
                saveCalls += 1;
                return [];
            });

            const streamer = ec2Orchestrator.createLogStreamer('dep-123', ['super-secret-db-pass']);
            const received = [];
            streamer.emitter.on('log', (entry) => received.push(entry));

            streamer.pushLine('Connecting with password=mysecretpass and token=ghp_12345');
            streamer.pushLine('Using DB pass super-secret-db-pass');
            await streamer.flush();

            assert.equal(received.length, 2);
            assert.equal(received[0].message.includes('mysecretpass'), false);
            assert.equal(received[0].message.includes('ghp_12345'), false);
            assert.ok(received[0].message.includes('[REDACTED]'));
            assert.equal(received[1].message.includes('super-secret-db-pass'), false);
            assert.ok(received[1].message.includes('[REDACTED]'));
            assert.equal(saveCalls, 1);
        });
    });

    // ─── TEST-EC2-07: HTTP Ingress Readiness Probe ────────────────────────────
    describe('TEST-EC2-07: waitForAppReady', () => {
        it('returns reachable: true when HTTP 200 is returned within retries', async () => {
            let calls = 0;
            mock.method(http, 'get', (_url, _opts, cb) => {
                calls += 1;
                const req = new EventEmitter();
                req.destroy = () => {};
                process.nextTick(() => {
                    if (calls < 2) {
                        req.emit('error', new Error('ECONNREFUSED'));
                    } else {
                        const res = new EventEmitter();
                        res.statusCode = 200;
                        res.resume = () => {};
                        cb(res);
                    }
                });
                return req;
            });

            const result = await ec2HealthService.waitForAppReady('54.210.120.45', 80, {
                maxRetries: 3,
                retryDelayMs: 10,
                probeTimeoutMs: 500,
            });

            assert.equal(result.reachable, true);
            assert.equal(result.liveUrl, 'http://54.210.120.45:80');
            assert.equal(result.statusCode, 200);
            assert.equal(result.attempts, 2);
        });

        it('returns reachable: false after exhausting retries', async () => {
            mock.method(http, 'get', () => {
                const req = new EventEmitter();
                req.destroy = () => {};
                process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
                return req;
            });

            const result = await ec2HealthService.waitForAppReady('54.210.120.45', 80, {
                maxRetries: 2,
                retryDelayMs: 10,
                probeTimeoutMs: 500,
            });

            assert.equal(result.reachable, false);
            assert.equal(result.attempts, 2);
        });
    });
});
