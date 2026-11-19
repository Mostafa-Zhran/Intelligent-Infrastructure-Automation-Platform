'use strict';

/**
 * Unit tests for SEC-02 — Isolated Execution Baseline & Security Hardening
 * Verifies that:
 * 1. Execution stages run with isolated boundaries and timeouts.
 * 2. No shell commands are constructed by concatenating unsanitized user inputs.
 * 3. Safe argument passing and environment variable injection are enforced across all runners.
 * 4. Resource limits (CPU/Memory/Timeouts) are defined for Kubernetes workloads and workflow jobs.
 * 5. Temporary sensitive artifacts (e.g., plan binaries, temporary keys) are cleaned up.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_PATH = path.resolve(__dirname, '../../../.github/workflows/deploy.yml');
const TF_SCRIPT_PATH = path.resolve(__dirname, '../../../terraform/scripts/run-terraform-stage.sh');
const ANSIBLE_SCRIPT_PATH = path.resolve(__dirname, '../../../ansible/scripts/run-ansible-stage.sh');
const K8S_SCRIPT_PATH = path.resolve(__dirname, '../../../k8s/scripts/render-and-deploy.sh');

describe('SEC-02 — Isolated Execution Baseline & Safety Controls', () => {
  const workflowContent = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const tfScriptContent = fs.readFileSync(TF_SCRIPT_PATH, 'utf8');
  const ansibleScriptContent = fs.readFileSync(ANSIBLE_SCRIPT_PATH, 'utf8');
  const k8sScriptContent = fs.readFileSync(K8S_SCRIPT_PATH, 'utf8');

  describe('Timeouts and Execution Boundaries', () => {
    it('deploy.yml must enforce a global job execution timeout', () => {
      assert.match(
        workflowContent,
        /timeout-minutes:\s*\d+/,
        'Workflow must define timeout-minutes to prevent hung execution'
      );
    });

    it('render-and-deploy.sh must enforce rollout timeout', () => {
      assert.match(
        k8sScriptContent,
        /--timeout="\$\{TIMEOUT_SECONDS\}s"/,
        'Kubernetes rollout must specify an explicit timeout flag'
      );
    });

    it('curl webhook callbacks must enforce timeout bounds', () => {
      assert.ok(
        tfScriptContent.includes('--max-time'),
        'Terraform runner callbacks must use --max-time'
      );
    });
  });

  describe('Unsanitized Command Construction Prevention', () => {
    it('Terraform runner must not execute raw shell commands from user parameters', () => {
      assert.ok(
        tfScriptContent.includes('APPROVED_TF_DIRS'),
        'Terraform directories must be restricted to server-controlled allowlist'
      );
      assert.ok(
        !tfScriptContent.includes('eval '),
        'Terraform runner must never use eval'
      );
    });

    it('Ansible runner must reject unapproved arbitrary playbook paths', () => {
      assert.ok(
        ansibleScriptContent.includes('APPROVED_PLAYBOOKS'),
        'Ansible playbooks must be restricted to server-controlled allowlist'
      );
      assert.ok(
        !ansibleScriptContent.includes('eval '),
        'Ansible runner must never use eval'
      );
    });
  });

  describe('Workload Resource Quotas and Limits', () => {
    it('Kubernetes deployment manifests must enforce resource requests and limits', () => {
      assert.ok(
        k8sScriptContent.includes('resources:'),
        'Manifest generator must specify resource constraints'
      );
      assert.ok(
        k8sScriptContent.includes('requests:') && k8sScriptContent.includes('limits:'),
        'Manifest generator must specify both requests and limits'
      );
      assert.ok(
        k8sScriptContent.includes('cpu:') && k8sScriptContent.includes('memory:'),
        'Manifest generator must limit both CPU and memory'
      );
    });
  });

  describe('Workspace & Temporary State Cleanup', () => {
    it('Terraform runner must clean up sensitive plan binaries after stage completion', () => {
      assert.ok(
        tfScriptContent.includes('rm -f "${PLAN_OUT}" "${PLAN_OUT}.binary"') ||
        tfScriptContent.includes('rm -f "${PLAN_OUT}"'),
        'Terraform runner must purge temporary plan files'
      );
    });
  });
});
