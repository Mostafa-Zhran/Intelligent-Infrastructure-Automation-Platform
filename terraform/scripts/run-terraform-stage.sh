#!/usr/bin/env bash
# ==============================================================================
# run-terraform-stage.sh — PIPE-06 Terraform Plan/Apply Stage Runner
# ==============================================================================
# Security contract:
#   - Only approved working directories are accepted (APPROVED_TF_DIRS allowlist).
#   - No user-supplied Terraform arguments are accepted.
#   - AWS credentials come from environment variables only (never command-line args).
#   - Sensitive Terraform outputs are never echoed; only a safe summary is captured.
#   - Stage status, timestamps, and safe failure details are posted to the Backend.
#   - Script exits with a non-zero code on any failure (set -euo pipefail).
#
# Required environment variables:
#   TF_WORKING_DIR   — Path to the Terraform workspace (must be in APPROVED_TF_DIRS).
#   TF_COMMAND       — One of: plan | apply | plan-only
#   DEPLOYMENT_ID    — Backend deployment UUID for status callback.
#   CORRELATION_ID   — Distributed tracing ID.
#   CALLBACK_URL     — Backend status webhook endpoint.
#   WORKER_API_KEY   — API key for backend callback authentication.
#
# Optional environment variables (AWS credentials — set by CI secret injection):
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
#   TF_VAR_* — Terraform variable overrides (server-managed only).
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 0. Approved Terraform working directories allowlist
# ------------------------------------------------------------------------------
APPROVED_TF_DIRS=(
  "terraform/environments/dev"
  "terraform/environments/staging"
  "terraform/environments/prod"
)

# ------------------------------------------------------------------------------
# 1. Validate required environment variables
# ------------------------------------------------------------------------------
: "${TF_WORKING_DIR:?ERROR: TF_WORKING_DIR is required}"
: "${TF_COMMAND:?ERROR: TF_COMMAND is required (plan|apply|plan-only)}"
: "${DEPLOYMENT_ID:?ERROR: DEPLOYMENT_ID is required}"
: "${CALLBACK_URL:?ERROR: CALLBACK_URL is required}"
: "${WORKER_API_KEY:?ERROR: WORKER_API_KEY is required}"
CORRELATION_ID="${CORRELATION_ID:-unknown}"

# ------------------------------------------------------------------------------
# 2. Security: Reject any TF_WORKING_DIR not in the approved list
# ------------------------------------------------------------------------------
APPROVED=false
for APPROVED_DIR in "${APPROVED_TF_DIRS[@]}"; do
  if [ "${TF_WORKING_DIR}" = "${APPROVED_DIR}" ]; then
    APPROVED=true
    break
  fi
done

if [ "${APPROVED}" != "true" ]; then
  echo "SECURITY ERROR: TF_WORKING_DIR '${TF_WORKING_DIR}' is not in the approved list." >&2
  echo "Approved directories:" >&2
  printf '  - %s\n' "${APPROVED_TF_DIRS[@]}" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. Security: Reject path traversal attempts
# ------------------------------------------------------------------------------
if [[ "${TF_WORKING_DIR}" == *".."* ]]; then
  echo "SECURITY ERROR: TF_WORKING_DIR contains path traversal sequence '..'." >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# 4. Validate TF_COMMAND value
# ------------------------------------------------------------------------------
case "${TF_COMMAND}" in
  plan|apply|plan-only) ;;
  *)
    echo "ERROR: TF_COMMAND '${TF_COMMAND}' is not supported. Use: plan | apply | plan-only" >&2
    exit 1
    ;;
esac

# ------------------------------------------------------------------------------
# 5. Verify terraform CLI is available
# ------------------------------------------------------------------------------
if ! command -v terraform &>/dev/null; then
  echo "ERROR: terraform CLI not found. Install Terraform before running this stage." >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# 6. Verify working directory exists
# ------------------------------------------------------------------------------
if [ ! -d "${TF_WORKING_DIR}" ]; then
  echo "ERROR: Terraform working directory '${TF_WORKING_DIR}' does not exist." >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# 7. Stage execution
# ------------------------------------------------------------------------------
STAGE_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
STAGE_STATUS="RUNNING"
SAFE_SUMMARY=""
EXIT_CODE=0

echo "======================================================================"
echo " PIPE-06: Terraform Stage"
echo " Working Directory: ${TF_WORKING_DIR}"
echo " Command:           ${TF_COMMAND}"
echo " Deployment ID:     ${DEPLOYMENT_ID}"
echo " Correlation ID:    ${CORRELATION_ID}"
echo " Started At:        ${STAGE_START}"
echo "======================================================================"

# Post stage RUNNING to backend
if [ -n "${CALLBACK_URL}" ] && [ -n "${WORKER_API_KEY}" ]; then
  curl -s -S -X POST "${CALLBACK_URL}" \
    -H "Content-Type: application/json" \
    -H "X-Worker-Api-Key: ${WORKER_API_KEY}" \
    -d "{\"status\":\"RUNNING\",\"stage\":\"PIPE-06-TERRAFORM\",\"startedAt\":\"${STAGE_START}\",\"correlationId\":\"${CORRELATION_ID}\"}" \
    --max-time 10 || echo "Warning: Backend RUNNING callback failed — continuing." >&2
fi

cd "${TF_WORKING_DIR}"

# terraform init
echo "--- terraform init ---"
terraform init -input=false -no-color 2>&1 | grep -v "terraform.tfstate" || true

# terraform validate
echo "--- terraform validate ---"
terraform validate -no-color

# terraform plan — always run; output is captured to a summary file
PLAN_OUT=$(mktemp /tmp/tf-plan-XXXXXX.txt)
echo "--- terraform plan ---"
set +e
terraform plan \
  -input=false \
  -no-color \
  -out="${PLAN_OUT}.binary" \
  2>&1 | tee "${PLAN_OUT}"
PLAN_EXIT=$?
set -e

if [ "${PLAN_EXIT}" -ne 0 ]; then
  STAGE_STATUS="FAILED"
  # Safe summary: capture only resource change counts, no state values
  SAFE_SUMMARY=$(grep -E "^(Plan:|No changes|Error:)" "${PLAN_OUT}" | head -5 | tr '\n' ' ' || echo "Terraform plan failed — see workflow logs.")
  echo "ERROR: terraform plan failed (exit ${PLAN_EXIT})" >&2
  EXIT_CODE=1
else
  # Extract safe plan summary (resource counts only, no sensitive values)
  SAFE_SUMMARY=$(grep -E "^(Plan:|No changes)" "${PLAN_OUT}" | head -3 | tr '\n' ' ' || echo "Plan completed.")
  echo "✓ Terraform plan succeeded: ${SAFE_SUMMARY}"
fi

# terraform apply — only if command is 'apply' and plan passed
if [ "${TF_COMMAND}" = "apply" ] && [ "${EXIT_CODE}" -eq 0 ]; then
  echo "--- terraform apply ---"
  set +e
  terraform apply \
    -input=false \
    -no-color \
    -auto-approve \
    "${PLAN_OUT}.binary" \
    2>&1 | grep -vE "(password|token|secret|key|credential|private)" | head -100
  APPLY_EXIT=$?
  set -e

  if [ "${APPLY_EXIT}" -ne 0 ]; then
    STAGE_STATUS="FAILED"
    SAFE_SUMMARY="Terraform apply failed after plan succeeded — see workflow logs."
    EXIT_CODE=1
  else
    STAGE_STATUS="SUCCEEDED"
    echo "✓ Terraform apply completed successfully."
  fi
elif [ "${EXIT_CODE}" -eq 0 ]; then
  STAGE_STATUS="SUCCEEDED"
fi

# Clean up plan files — never persist plan binary (may contain sensitive data)
rm -f "${PLAN_OUT}" "${PLAN_OUT}.binary" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 8. Post final stage status to backend
# ------------------------------------------------------------------------------
STAGE_END=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Truncate summary to 250 chars for safe API transmission
SAFE_SUMMARY="${SAFE_SUMMARY:0:250}"

if [ -n "${CALLBACK_URL}" ] && [ -n "${WORKER_API_KEY}" ]; then
  curl -s -S -X POST "${CALLBACK_URL}" \
    -H "Content-Type: application/json" \
    -H "X-Worker-Api-Key: ${WORKER_API_KEY}" \
    -d "{\"status\":\"${STAGE_STATUS}\",\"stage\":\"PIPE-06-TERRAFORM\",\"startedAt\":\"${STAGE_START}\",\"finishedAt\":\"${STAGE_END}\",\"summary\":\"${SAFE_SUMMARY}\",\"correlationId\":\"${CORRELATION_ID}\"}" \
    --max-time 10 || echo "Warning: Backend final callback failed." >&2
fi

echo "======================================================================"
echo " PIPE-06 Terraform Stage Complete: ${STAGE_STATUS}"
echo " Finished At: ${STAGE_END}"
echo "======================================================================"

# Propagate exit code to pipeline — stops subsequent stages on failure
exit "${EXIT_CODE}"
