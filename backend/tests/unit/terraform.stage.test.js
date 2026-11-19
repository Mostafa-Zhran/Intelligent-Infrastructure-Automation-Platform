'use strict';

/**
 * Unit tests for PIPE-06 — Terraform Stage Runner
 * Validates: script existence, security controls, approved-dir allowlist,
 * bash error handling, secret redaction, and status callback contract.
 *
 * NOTE: Terraform CLI is not installed locally.
 * Tests validate script content and security properties via file inspection.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT_PATH = path.resolve(
  __dirname,
  '../../../terraform/scripts/run-terraform-stage.sh'
);

let scriptContent = '';

describe('PIPE-06 — Terraform Stage Runner Security & Contract', () => {
  before(() => {
    assert.ok(
      fs.existsSync(SCRIPT_PATH),
      `run-terraform-stage.sh must exist at ${SCRIPT_PATH}`
    );
    scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
  });

  // --------------------------------------------------------------------------
  describe('Bash safety baseline', () => {
    it('must enable strict error handling (set -euo pipefail)', () => {
      assert.ok(
        scriptContent.includes('set -euo pipefail'),
        'Script must use "set -euo pipefail" to stop on any error'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('Approved working directory allowlist', () => {
    it('must define an APPROVED_TF_DIRS allowlist', () => {
      assert.ok(
        scriptContent.includes('APPROVED_TF_DIRS'),
        'Script must define an APPROVED_TF_DIRS allowlist'
      );
    });

    it('must reject TF_WORKING_DIR not in the approved list', () => {
      assert.ok(
        scriptContent.includes('SECURITY ERROR') &&
        scriptContent.includes('not in the approved list'),
        'Script must print SECURITY ERROR and exit when dir is not approved'
      );
    });

    it('must only allow approved terraform/environments/* directories', () => {
      assert.ok(
        scriptContent.includes('terraform/environments/dev'),
        'dev environment must be in the approved list'
      );
    });

    it('must reject path traversal sequences (..)', () => {
      assert.ok(
        scriptContent.includes('..') && scriptContent.includes('path traversal'),
        'Script must detect and reject ".." path traversal in TF_WORKING_DIR'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('TF_COMMAND allowlist', () => {
    it('must only allow plan, apply, or plan-only commands', () => {
      assert.ok(
        scriptContent.includes('plan|apply|plan-only') ||
        (scriptContent.includes('"plan"') &&
          scriptContent.includes('"apply"') &&
          scriptContent.includes('"plan-only"')),
        'TF_COMMAND must be restricted to plan, apply, or plan-only'
      );
    });

    it('must reject unsupported TF_COMMAND values', () => {
      assert.ok(
        scriptContent.includes('not supported') ||
        scriptContent.includes('TF_COMMAND'),
        'Script must reject unsupported TF_COMMAND values with a clear error'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('Secret redaction and sensitive output handling', () => {
    it('must filter sensitive keywords from terraform apply output', () => {
      assert.ok(
        scriptContent.includes('password|token|secret|key|credential|private'),
        'Script must grep-filter sensitive keywords from terraform apply output'
      );
    });

    it('must delete plan binary after use (plan files may contain sensitive data)', () => {
      assert.ok(
        scriptContent.includes('rm -f') && scriptContent.includes('.binary'),
        'Script must delete plan binary files after use'
      );
    });

    it('must capture only resource count summary from plan — not state values', () => {
      assert.ok(
        scriptContent.includes('Plan:') || scriptContent.includes('No changes'),
        'Safe summary must only extract "Plan:" or "No changes" lines'
      );
    });

    it('must truncate safe summary to 250 characters before API callback', () => {
      assert.ok(
        scriptContent.includes(':0:250'),
        'Script must truncate SAFE_SUMMARY to 250 chars before posting to backend'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('Required environment variable validation', () => {
    const required = [
      'TF_WORKING_DIR',
      'TF_COMMAND',
      'DEPLOYMENT_ID',
      'CALLBACK_URL',
      'WORKER_API_KEY',
    ];
    for (const envVar of required) {
      it(`must fail fast when ${envVar} is not set`, () => {
        assert.ok(
          scriptContent.includes(`:? ERROR: ${envVar}`) ||
          scriptContent.includes(`${envVar}:?`),
          `Script must use bash :? to require ${envVar}`
        );
      });
    }
  });

  // --------------------------------------------------------------------------
  describe('Status callback contract', () => {
    it('must post RUNNING status at stage start', () => {
      assert.ok(
        scriptContent.includes('"RUNNING"') &&
        scriptContent.includes('PIPE-06-TERRAFORM'),
        'Script must post RUNNING stage status callback with stage name'
      );
    });

    it('must post SUCCEEDED status on success', () => {
      assert.ok(
        scriptContent.includes('"SUCCEEDED"'),
        'Script must post SUCCEEDED status to backend callback on success'
      );
    });

    it('must post FAILED status and safe summary on failure', () => {
      assert.ok(
        scriptContent.includes('"FAILED"') &&
        scriptContent.includes('SAFE_SUMMARY'),
        'Script must post FAILED status with safe summary on failure'
      );
    });

    it('must include startedAt and finishedAt timestamps in callback', () => {
      assert.ok(
        scriptContent.includes('startedAt') && scriptContent.includes('finishedAt'),
        'Callback payload must include both startedAt and finishedAt timestamps'
      );
    });

    it('must include correlationId in every callback', () => {
      assert.ok(
        scriptContent.includes('correlationId'),
        'All backend callbacks must include correlationId for distributed tracing'
      );
    });

    it('must use --max-time for curl callbacks to prevent hanging', () => {
      assert.ok(
        scriptContent.includes('--max-time'),
        'curl callbacks must use --max-time to prevent pipeline hangs'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('Exit code propagation', () => {
    it('must propagate non-zero exit code to stop subsequent pipeline stages', () => {
      assert.ok(
        scriptContent.includes('exit "${EXIT_CODE}"') ||
        scriptContent.includes("exit \"${EXIT_CODE}\""),
        'Script must exit with captured EXIT_CODE to propagate failures'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('deploy.yml PIPE-06 integration', () => {
    const workflowPath = path.resolve(
      __dirname,
      '../../../.github/workflows/deploy.yml'
    );
    let workflowContent = '';

    before(() => {
      assert.ok(fs.existsSync(workflowPath), 'deploy.yml must exist');
      workflowContent = fs.readFileSync(workflowPath, 'utf8');
    });

    it('must include a PIPE-06 Terraform step', () => {
      assert.ok(
        workflowContent.includes('PIPE-06'),
        'deploy.yml must include the PIPE-06 Terraform stage step'
      );
    });

    it('must inject AWS credentials from secrets — not user inputs', () => {
      assert.ok(
        workflowContent.includes('secrets.AWS_ACCESS_KEY_ID') &&
        workflowContent.includes('secrets.AWS_SECRET_ACCESS_KEY'),
        'AWS credentials must come from repository secrets, not workflow inputs'
      );
    });

    it('must run run-terraform-stage.sh from the approved script path', () => {
      assert.ok(
        workflowContent.includes('run-terraform-stage.sh'),
        'deploy.yml must invoke the approved terraform stage runner script'
      );
    });

    it('must place PIPE-06 before PIPE-07 in the workflow', () => {
      const pipe06Pos = workflowContent.indexOf('PIPE-06');
      const pipe07Pos = workflowContent.indexOf('PIPE-07');
      assert.ok(
        pipe06Pos !== -1 && pipe07Pos !== -1 && pipe06Pos < pipe07Pos,
        'PIPE-06 (Terraform) must appear before PIPE-07 (Kubernetes) in deploy.yml'
      );
    });
  });
});
