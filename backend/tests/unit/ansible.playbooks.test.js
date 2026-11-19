// tests/unit/ansible.playbooks.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('ANS-01 — Ansible Playbooks, Roles & Security Compliance', () => {
    const ansibleDir = path.resolve(__dirname, '../../../ansible');

    // ── File Structure ────────────────────────────────────────────────────────
    it('should have all required Ansible files and directories present', () => {
        const required = [
            'ansible.cfg',
            'inventory/hosts.yml',
            'inventory/group_vars/all.yml',
            'playbooks/site.yml',
            'playbooks/bootstrap-build-agents.yml',
            'roles/common/tasks/main.yml',
            'roles/common/defaults/main.yml',
            'roles/common/handlers/main.yml',
            'roles/docker/tasks/main.yml',
            'roles/docker/defaults/main.yml',
            'roles/docker/handlers/main.yml',
            'scripts/run-ansible-stage.sh',
        ];

        for (const f of required) {
            assert(
                fs.existsSync(path.join(ansibleDir, f)),
                `Missing required file: ansible/${f}`
            );
        }
    });

    // ── ansible.cfg Security ──────────────────────────────────────────────────
    describe('ansible.cfg — hardened configuration', () => {
        const cfg = fs.readFileSync(path.join(ansibleDir, 'ansible.cfg'), 'utf8');

        it('must enable host_key_checking (no TOFU bypass)', () => {
            assert(cfg.includes('host_key_checking   = true'));
        });

        it('must disable retry files to avoid state leakage', () => {
            assert(cfg.includes('retry_files_enabled = false'));
        });

        it('must set any_errors_fatal to stop pipeline on first failure', () => {
            // ansible.cfg sets global default; playbooks also enforce this
            assert(cfg.includes('any_errors_fatal    = true'));
        });
    });

    // ── Inventory Security ────────────────────────────────────────────────────
    describe('inventory/hosts.yml — server-managed only', () => {
        const inv = fs.readFileSync(path.join(ansibleDir, 'inventory/hosts.yml'), 'utf8');

        it('must reference env-var for ansible_user (no hardcoded users)', () => {
            assert(inv.includes("lookup('env'"), 'ansible_user must come from env lookup, not hardcoded');
        });

        it('must NOT contain hardcoded IP addresses', () => {
            // No actual IPs — only commented-out template lines allowed
            const lines = inv.split('\n').filter(l => !l.trim().startsWith('#'));
            const ipPattern = /ansible_host:\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
            const hasHardcodedIp = lines.some(l => ipPattern.test(l));
            assert(!hasHardcodedIp, 'Inventory must NOT contain hardcoded IP addresses');
        });
    });

    // ── group_vars Secret Discipline ──────────────────────────────────────────
    describe('inventory/group_vars/all.yml — no secrets stored', () => {
        const groupVars = fs.readFileSync(path.join(ansibleDir, 'inventory/group_vars/all.yml'), 'utf8');

        it('must list sensitive_env_vars for redaction reference', () => {
            assert(groupVars.includes('sensitive_env_vars'));
        });

        it('must NOT contain actual secret values', () => {
            const forbiddenPatterns = [
                /password\s*:\s*\S+/i,
                /token\s*:\s*\S+/i,
                /secret\s*:\s*\S+/i,
                /AWS_SECRET_ACCESS_KEY\s*:\s*\S+/,
            ];
            for (const pattern of forbiddenPatterns) {
                assert(!pattern.test(groupVars), `group_vars/all.yml must not contain plaintext secrets`);
            }
        });
    });

    // ── Playbook Contracts ────────────────────────────────────────────────────
    describe('playbooks/site.yml — pipeline stage contract', () => {
        const playbook = fs.readFileSync(path.join(ansibleDir, 'playbooks/site.yml'), 'utf8');

        it('must set any_errors_fatal: true to stop pipeline on failure', () => {
            assert(playbook.includes('any_errors_fatal: true'));
        });

        it('must record stage start and finish timestamps', () => {
            assert(playbook.includes('stage_started_at'));
            assert(playbook.includes('stage_finished_at'));
        });

        it('must include the common role', () => {
            assert(playbook.includes('role: common'));
        });
    });

    // ── Common Role Security Hardening ────────────────────────────────────────
    describe('roles/common — SSH hardening tasks', () => {
        const tasks = fs.readFileSync(path.join(ansibleDir, 'roles/common/tasks/main.yml'), 'utf8');

        it('must disable password authentication via SSH', () => {
            assert(tasks.includes('PasswordAuthentication no'));
        });

        it('must disable root login via SSH', () => {
            assert(tasks.includes('PermitRootLogin no'));
        });

        it('must disable X11 forwarding', () => {
            assert(tasks.includes('X11Forwarding no'));
        });

        it('must validate sshd_config changes before applying', () => {
            assert(tasks.includes('/usr/sbin/sshd -t -f %s'), 'sshd_config changes must be validated before restart');
        });

        it('must NOT output any sensitive env variable values', () => {
            // Ensure no sensitive lookup in debug tasks without no_log
            const sensitiveKeys = ['token', 'password', 'secret', 'key'];
            const debugBlocks = tasks.match(/debug:[\s\S]*?msg:[\s\S]*?(?=\n\s*-|\Z)/g) || [];
            for (const block of debugBlocks) {
                for (const key of sensitiveKeys) {
                    assert(
                        !block.toLowerCase().includes(`${key}:`),
                        `Debug task must not output potential secret field: ${key}`
                    );
                }
            }
        });
    });

    // ── Docker Role Version Pinning ───────────────────────────────────────────
    describe('roles/docker — approved version pinning', () => {
        const defaults = fs.readFileSync(path.join(ansibleDir, 'roles/docker/defaults/main.yml'), 'utf8');
        const tasks = fs.readFileSync(path.join(ansibleDir, 'roles/docker/tasks/main.yml'), 'utf8');

        it('must pin docker_ce_version in defaults', () => {
            assert(defaults.includes('docker_ce_version:'), 'Docker version must be pinned');
            const match = defaults.match(/docker_ce_version:\s*"?([^"\n]+)"?/);
            assert(match && match[1].trim().length > 0, 'docker_ce_version must have a value');
        });

        it('must configure log rotation in daemon config', () => {
            assert(defaults.includes('log-driver'));
            assert(defaults.includes('max-size'));
        });

        it('must remove legacy Docker packages before installing', () => {
            assert(tasks.includes('docker.io'), 'Must remove legacy docker.io package');
        });

        it('must enable Docker service on boot', () => {
            assert(tasks.includes('enabled: true'));
        });
    });

    // ── Stage Runner Security ─────────────────────────────────────────────────
    describe('scripts/run-ansible-stage.sh — approved playbook whitelist', () => {
        const script = fs.readFileSync(path.join(ansibleDir, 'scripts/run-ansible-stage.sh'), 'utf8');

        it('must enforce strict bash error handling (set -euo pipefail)', () => {
            assert(script.includes('set -euo pipefail'));
        });

        it('must maintain an APPROVED_PLAYBOOKS allowlist and reject unknown playbooks', () => {
            assert(script.includes('APPROVED_PLAYBOOKS='));
            assert(script.includes('SECURITY ERROR'));
        });

        it('must NOT echo sensitive env vars (WORKER_API_KEY, ANSIBLE_PRIVATE_KEY etc.)', () => {
            const echoLines = script.split('\n').filter(l => l.trim().startsWith('echo'));
            const sensitiveVars = ['WORKER_API_KEY', 'ANSIBLE_PRIVATE_KEY', 'AWS_SECRET', 'DATABASE_URL'];
            for (const line of echoLines) {
                for (const sv of sensitiveVars) {
                    assert(!line.includes(`\${${sv}}`),
                        `echo must not output sensitive variable: ${sv}`);
                }
            }
        });

        it('must send status callback to backend on completion', () => {
            assert(script.includes('CALLBACK_URL'));
            assert(script.includes('X-Worker-Api-Key'));
        });

        it('must propagate ansible-playbook exit code to the pipeline', () => {
            assert(script.includes('exit "${ANSIBLE_EXIT_CODE}"'));
        });
    });
});
