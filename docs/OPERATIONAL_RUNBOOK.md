# IIAP Operational Runbook & Observability Guide
**Intelligent Infrastructure Automation Platform (MVP)**

This document provides runbook procedures, operational health check references, and incident response guidelines for troubleshooting MVP deployments and infrastructure across all pipeline stages.

---

## 1. Observability Architecture & Health Checks

### Backend & Service Health Probe
- **Endpoint:** `GET /health`
- **Output Schema:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "ci": {
      "provider": "GITHUB_ACTIONS",
      "mode": "live",
      "configured": true
    },
    "uptime": 12480,
    "timestamp": "2026-11-18T18:00:00.000Z"
  }
  ```
- **Alert Condition:** HTTP 503 response indicates database disconnected or degraded configuration.

---

## 2. Where to Find Logs During Incidents

| Pipeline Stage / Component | Location | Access Method | Retention & Redaction |
| :--- | :--- | :--- | :--- |
| **Backend REST API** | Railway Platform Logs / Docker stdout | Railway Dashboard or `railway logs` | Secrets stripped via sanitize/redact middleware |
| **GitHub Actions Pipeline** | GitHub Repository Actions tab | `https://github.com/<org>/<repo>/actions` | GitHub native secret masking + runner ephemeral cleanup |
| **Ansible Server Configuration** | Pipeline runner stdout + Deployment Events table | `GET /api/deployments/:id/logs` | `sensitive_env_vars` redacted by `run-ansible-stage.sh` |
| **Terraform Plan / Apply** | Pipeline runner stdout + Deployment Events | Captured in `PIPE-06` deployment summary | Plan binaries erased; sensitive state values excluded |
| **Kubernetes Rollout & Pods** | Cluster control plane / worker nodes | `kubectl logs -n app-<env> -l app.kubernetes.io/name=app-<id>` | `kubectl describe pod` for CrashLoop / ImagePullBackOff |

---

## 3. Incident Triage Procedures

### Incident A: Stuck or Hanging Deployment (Status: `QUEUED`)
- **Root Cause:** GitHub Actions runner queue delay or ambiguous dispatch timeout.
- **Triage Steps:**
  1. Inspect `ci_jobs` table for `external_job_id` or workflow dispatch status.
  2. Check GitHub Actions workflow tab for queued or stalled runs.
  3. Deployments with duration exceeding 30 minutes are automatically terminated by runner `timeout-minutes: 30`.
  4. If runner failed to call back: invoke `POST /api/deployments/:id/status` with `FAILED` and safe summary.

### Incident B: Terraform Plan/Apply Failure
- **Root Cause:** AWS permission issue, resource conflict, or state lock in DynamoDB.
- **Triage Steps:**
  1. Review safe failure summary in `GET /api/deployments/:id/logs`.
  2. Inspect DynamoDB lock table `iiap-terraform-locks` if another pipeline holds the state lock.
  3. Verify AWS credentials and permissions for the target environment.

### Incident C: Kubernetes Workload Rollout Failure
- **Root Cause:** Health probe failure (`/health`), CrashLoopBackOff, or insufficient cluster resources.
- **Triage Steps:**
  1. Check deployment rollout events:
     ```bash
     kubectl get events -n app-development --sort-by='.metadata.creationTimestamp'
     ```
  2. Check container logs:
     ```bash
     kubectl logs -n app-development deployment/app-<project-id> -c app --tail=100
     ```
  3. Verify liveness and readiness probe response: container must serve HTTP 200 on port 3000 at `/health`.

---

## 4. Secret Redaction Policy
All pipeline runners (`run-ansible-stage.sh`, `run-terraform-stage.sh`, `render-and-deploy.sh`, and backend controllers) enforce:
- Zero raw secrets printed to terminal outputs or database logs.
- Automatic filtering of tokens, passwords, and private keys.
- Plan binary destruction upon stage completion.
