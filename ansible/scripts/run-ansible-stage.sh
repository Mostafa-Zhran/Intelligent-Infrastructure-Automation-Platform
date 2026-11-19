#!/usr/bin/env bash
# ==============================================================================
# ANS-01: Ansible Pipeline Stage Runner
# Intelligent Infrastructure Automation Platform (IIAP)
#
# SECURITY CONTRACT:
#   - Only approved playbooks from this repository can be executed.
#   - No user-supplied playbook paths, inventory files, or extra-vars accepted.
#   - Sensitive env vars are NEVER echoed to stdout/stderr.
#   - Exit code propagates pipeline failure to GitHub Actions.
# ==============================================================================
set -euo pipefail

# ── Approved constants (not overridable from outside) ─────────────────────────
readonly ANSIBLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly APPROVED_PLAYBOOKS=(
  "playbooks/site.yml"
  "playbooks/bootstrap-build-agents.yml"
)

# ── Pipeline context (injected by GitHub Actions, NOT user input) ──────────────
PLAYBOOK_NAME="${ANSIBLE_PLAYBOOK:-playbooks/site.yml}"
DEPLOYMENT_ID="${DEPLOYMENT_ID:-}"
CORRELATION_ID="${CORRELATION_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
CALLBACK_URL="${CALLBACK_URL:-}"
WORKER_API_KEY="${WORKER_API_KEY:-}"

# ── Timestamps ─────────────────────────────────────────────────────────────────
STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=========================================================="
echo " ANS-01 — Ansible Configuration Stage"
echo " Playbook:      ${PLAYBOOK_NAME}"
echo " Deployment ID: ${DEPLOYMENT_ID}"
echo " Correlation:   ${CORRELATION_ID}"
echo " Environment:   ${ENVIRONMENT}"
echo " Started At:    ${STARTED_AT}"
echo "=========================================================="

# ── Security check: only approved playbooks may run ───────────────────────────
playbook_approved=false
for approved in "${APPROVED_PLAYBOOKS[@]}"; do
  if [[ "${PLAYBOOK_NAME}" == "${approved}" ]]; then
    playbook_approved=true
    break
  fi
done

if [[ "${playbook_approved}" == "false" ]]; then
  echo "SECURITY ERROR: Playbook '${PLAYBOOK_NAME}' is not in the approved list." >&2
  echo "Approved playbooks: ${APPROVED_PLAYBOOKS[*]}" >&2
  exit 1
fi

FULL_PLAYBOOK_PATH="${ANSIBLE_DIR}/${PLAYBOOK_NAME}"
if [[ ! -f "${FULL_PLAYBOOK_PATH}" ]]; then
  echo "ERROR: Approved playbook not found at '${FULL_PLAYBOOK_PATH}'" >&2
  exit 1
fi

# ── Run Ansible ────────────────────────────────────────────────────────────────
# Extra-vars are pipeline metadata only — no user-supplied values.
export ANSIBLE_ROLES_PATH="${ANSIBLE_DIR}/roles:${ANSIBLE_DIR}/../roles"
ANSIBLE_EXIT_CODE=0

# Check if inventory has any active hosts configured (non-commented)
ACTIVE_HOSTS=$(grep -E '^\s*ansible_host:' "${ANSIBLE_DIR}/inventory/hosts.yml" | wc -l || echo "0")

if [[ "${ACTIVE_HOSTS}" -eq 0 ]]; then
  echo "Notice: No remote target hosts configured in inventory (pre-infrastructure provisioning)."
  echo "--> Validating playbook syntax and role dependency integrity..."
  ansible-playbook \
    --inventory "${ANSIBLE_DIR}/inventory/hosts.yml" \
    --syntax-check \
    "${FULL_PLAYBOOK_PATH}" 2>&1 || ANSIBLE_EXIT_CODE=$?

  if [[ "${ANSIBLE_EXIT_CODE}" -eq 0 ]]; then
    echo "✓ Ansible playbooks and roles syntax validated successfully."
  fi
else
  ansible-playbook \
    --inventory "${ANSIBLE_DIR}/inventory/hosts.yml" \
    --extra-vars "deployment_id=${DEPLOYMENT_ID} correlation_id=${CORRELATION_ID} deploy_env=${ENVIRONMENT}" \
    "${FULL_PLAYBOOK_PATH}" 2>&1 || ANSIBLE_EXIT_CODE=$?
fi

FINISHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=========================================================="
if [[ "${ANSIBLE_EXIT_CODE}" -eq 0 ]]; then
  echo " ANS-01 Completed SUCCESSFULLY"
  STAGE_STATUS="SUCCEEDED"
else
  echo " ANS-01 FAILED with exit code ${ANSIBLE_EXIT_CODE}"
  STAGE_STATUS="FAILED"
fi
echo " Started:  ${STARTED_AT}"
echo " Finished: ${FINISHED_AT}"
echo "=========================================================="

# ── Post stage callback to backend ────────────────────────────────────────────
if [[ -n "${CALLBACK_URL}" ]] && [[ -n "${WORKER_API_KEY}" ]]; then
  curl -s -S -X POST "${CALLBACK_URL}" \
    -H "Content-Type: application/json" \
    -H "X-Worker-Api-Key: ${WORKER_API_KEY}" \
    -d "{
      \"status\": \"${STAGE_STATUS}\",
      \"stage\": \"ANS_01\",
      \"startedAt\": \"${STARTED_AT}\",
      \"finishedAt\": \"${FINISHED_AT}\",
      \"correlationId\": \"${CORRELATION_ID}\"
    }" || echo "Warning: Backend callback failed (non-fatal)"
fi

exit "${ANSIBLE_EXIT_CODE}"
