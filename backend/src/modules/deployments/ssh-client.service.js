const { Client } = require('ssh2');

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_COMMAND_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Normalize raw ssh2 connection errors into actionable diagnostics.
 */
function classifySshError(err, host, port) {
    const msg = String(err?.message || 'SSH connection error');
    const code = err?.code || '';

    if (
        code === 'ETIMEDOUT' ||
        msg.toLowerCase().includes('timed out') ||
        msg.toLowerCase().includes('timeout')
    ) {
        const error = new Error(
            `Connection to ${host}:${port} timed out. Please ensure your AWS Security Group allows inbound traffic on port ${port}.`
        );
        error.code = 'SSH_CONNECTION_TIMEOUT';
        error.healthStatus = 'UNREACHABLE';
        error.statusCode = 400;
        return error;
    }

    if (
        msg.toLowerCase().includes('authentication') ||
        msg.toLowerCase().includes('parse') ||
        msg.toLowerCase().includes('privatekey') ||
        msg.toLowerCase().includes('key format')
    ) {
        const error = new Error(
            `SSH authentication failed for ${host}:${port}. Please verify your SSH username and private key.`
        );
        error.code = 'SSH_AUTH_FAILED';
        error.healthStatus = 'AUTH_FAILED';
        error.statusCode = 400;
        return error;
    }

    const error = new Error(
        `Unable to reach ${host}:${port} (${code || msg}). Check that the EC2 instance is running and reachable.`
    );
    error.code = 'SSH_UNREACHABLE';
    error.healthStatus = 'UNREACHABLE';
    error.statusCode = 400;
    return error;
}

/**
 * Execute a single command on an established SSH connection with optional streaming.
 */
function execCommand(conn, command, { onStdout, onStderr, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        conn.exec(command, (err, stream) => {
            if (err) {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    reject(err);
                }
                return;
            }

            let stdout = '';
            let stderr = '';

            stream.on('data', (chunk) => {
                const text = chunk.toString('utf8');
                stdout += text;
                if (onStdout) onStdout(text);
            });

            stream.stderr.on('data', (chunk) => {
                const text = chunk.toString('utf8');
                stderr += text;
                if (onStderr) onStderr(text);
            });

            stream.on('close', (exitCode) => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    resolve({
                        stdout,
                        stderr,
                        exitCode: typeof exitCode === 'number' ? exitCode : 0,
                    });
                }
            });
        });
    });
}

/**
 * Establish an SSH connection, run an async callback with the connection, and always close cleanly.
 */
function withSshConnection(
    { host, port = 22, username = 'ubuntu', privateKey, readyTimeout = DEFAULT_CONNECT_TIMEOUT_MS },
    fn
) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        let finished = false;

        const finish = (err, result) => {
            if (finished) return;
            finished = true;
            try {
                conn.end();
            } catch {
                // ignore close errors
            }
            if (err) reject(err);
            else resolve(result);
        };

        conn.on('ready', async () => {
            try {
                const result = await fn(conn);
                finish(null, result);
            } catch (execErr) {
                finish(execErr);
            }
        });

        conn.on('error', (err) => {
            finish(classifySshError(err, host, port));
        });

        try {
            conn.connect({
                host,
                port,
                username,
                privateKey,
                readyTimeout,
            });
        } catch (syncErr) {
            finish(classifySshError(syncErr, host, port));
        }
    });
}

/**
 * Pre-flight diagnostic probe for an EC2 host:
 * verifies SSH reachability, authentication, OS metadata, Docker installation, and permissions.
 */
async function probeHost({ host, port = 22, username = 'ubuntu', privateKey }) {
    return withSshConnection({ host, port, username, privateKey }, async (conn) => {
        const script = [
            'OS_NAME=$(grep -m1 "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d= -f2- | tr -d \'"\' || uname -sr)',
            'DOCKER_VER=$(docker --version 2>/dev/null || echo "")',
            'DOCKER_NOSUDO=0',
            'if [ -n "$DOCKER_VER" ] && docker info >/dev/null 2>&1; then DOCKER_NOSUDO=1; fi',
            'SUDO_OK=0',
            'if [ "$(id -u)" = "0" ] || sudo -n true 2>/dev/null; then SUDO_OK=1; fi',
            'echo "OS=${OS_NAME}"',
            'echo "DOCKER_VER=${DOCKER_VER}"',
            'echo "DOCKER_NOSUDO=${DOCKER_NOSUDO}"',
            'echo "SUDO_OK=${SUDO_OK}"',
        ].join('\n');

        const { stdout } = await execCommand(conn, script, { timeoutMs: 15000 });
        const map = {};
        for (const line of stdout.split('\n')) {
            const idx = line.indexOf('=');
            if (idx > 0) {
                map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
        }

        const dockerVersion = map.DOCKER_VER || null;
        return {
            reachable: true,
            portOpen: true,
            authenticated: true,
            osInfo: map.OS || 'Linux',
            dockerInstalled: Boolean(dockerVersion),
            dockerVersion,
            canRunDockerWithoutSudo: map.DOCKER_NOSUDO === '1',
            hasSudoAccess: map.SUDO_OK === '1',
        };
    });
}

module.exports = {
    classifySshError,
    execCommand,
    withSshConnection,
    probeHost,
};
