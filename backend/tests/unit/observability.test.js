'use strict';

/**
 * Unit tests for TEST-03 — Minimum Observability & Health Checks
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RUNBOOK_PATH = path.resolve(__dirname, '../../../docs/OPERATIONAL_RUNBOOK.md');
const APP_PATH = path.resolve(__dirname, '../../src/app.js');

describe('TEST-03 — Minimum Observability & Operational Readiness', () => {
  it('OPERATIONAL_RUNBOOK.md must exist and document incident triage procedures', () => {
    assert.ok(fs.existsSync(RUNBOOK_PATH), 'OPERATIONAL_RUNBOOK.md must exist');
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

    assert.ok(content.includes('Incident Triage Procedures'), 'Must document triage procedures');
    assert.ok(content.includes('Where to Find Logs During Incidents'), 'Must document log locations');
    assert.ok(content.includes('Secret Redaction Policy'), 'Must document secret redaction policy');
    assert.ok(content.includes('Kubernetes Workload Rollout Failure'), 'Must document k8s troubleshooting');
  });

  it('Health endpoint in app.js must expose database and CI status probe', () => {
    const appContent = fs.readFileSync(APP_PATH, 'utf8');

    assert.ok(appContent.includes("app.get('/health'"), 'Must define GET /health route');
    assert.ok(appContent.includes('ci:'), 'Health endpoint must report CI connectivity details');
    assert.ok(appContent.includes('provider: \'GITHUB_ACTIONS\''), 'Health endpoint must identify GITHUB_ACTIONS');
  });
});
