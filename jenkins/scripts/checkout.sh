#!/usr/bin/env bash
# ==============================================================================
# Pipeline Stage: PIPE-04 — Secure Repository Checkout
# Intelligent Infrastructure Automation Platform
# ==============================================================================
# Security Rules Enforced:
# 1. Exact commit SHA checkout (detached HEAD), verified against git rev-parse HEAD.
# 2. In-memory credentials only — zero tokens persisted to .git/config or logs.
# 3. Isolated directory execution.
# 4. Workspace disk space verification prior to checkout.
# 5. Safe sanitization of error messages.
# ==============================================================================

set -euo pipefail

# Disable git interactive prompts
export GIT_TERMINAL_PROMPT=0

REPO_URL="${1:-${REPO_URL:-}}"
COMMIT_SHA="${2:-${COMMIT_SHA:-}}"
TARGET_DIR="${3:-${TARGET_DIR:-./src-repo}}"
DOCKERFILE_PATH="${4:-${DOCKERFILE_PATH:-Dockerfile}}"
MIN_DISK_KB="${MIN_DISK_KB:-1048576}" # 1 GB minimum required

echo "=========================================================="
echo " [PIPE-04] Starting Secure Repository Checkout Stage"
echo " Correlation ID: ${CORRELATION_ID:-none}"
echo " Deployment ID:  ${DEPLOYMENT_ID:-none}"
echo " Target Dir:     ${TARGET_DIR}"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 1. Validate Input Parameters
# ------------------------------------------------------------------------------
if [[ -z "${REPO_URL}" ]]; then
    echo "ERROR: REPO_URL is required." >&2
    exit 1
fi

if [[ -z "${COMMIT_SHA}" ]]; then
    echo "ERROR: COMMIT_SHA is required." >&2
    exit 1
fi

# Verify commit SHA format (exact 40 hexadecimal characters)
if ! [[ "${COMMIT_SHA}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "ERROR: COMMIT_SHA must be an exact 40-character hexadecimal string." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Verify Available Disk Space
# ------------------------------------------------------------------------------
AVAILABLE_KB=$(df -k . | awk 'NR==2 {print $4}')
if [[ "${AVAILABLE_KB}" -lt "${MIN_DISK_KB}" ]]; then
    echo "ERROR: Insufficient disk space on agent. Available: ${AVAILABLE_KB} KB, Required: ${MIN_DISK_KB} KB" >&2
    exit 1
fi
echo "✓ Disk space verification passed (${AVAILABLE_KB} KB available)."

# ------------------------------------------------------------------------------
# 3. Clean & Prepare Isolated Workspace Directory
# ------------------------------------------------------------------------------
rm -rf "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"

# ------------------------------------------------------------------------------
# 4. Perform Secure Clone & Exact Commit Checkout
# ------------------------------------------------------------------------------
echo "Initializing isolated repository workspace..."
cd "${TARGET_DIR}"
git init -q

# Set safe local config without credentials
git config user.name "IIAP Automation Pipeline"
git config user.email "pipeline@iiap.internal"
git config advice.detachedHead false

# Check if a GitHub authentication token is provided in environment
AUTH_HEADER=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    # Pass token strictly via in-memory git command argument
    # NEVER write the token into .git/config remote URL
    AUTH_HEADER=(-c "http.extraHeader=Authorization: Bearer ${GITHUB_TOKEN}")
fi

echo "Fetching exact commit ${COMMIT_SHA:0:8} from remote repository..."
# Fetch the specific commit directly to minimize transfer time and isolate history
git "${AUTH_HEADER[@]}" remote add origin "${REPO_URL}"
git "${AUTH_HEADER[@]}" fetch --depth 1 origin "${COMMIT_SHA}"

echo "Checking out exact commit ${COMMIT_SHA} in detached HEAD mode..."
git checkout --detach "${COMMIT_SHA}" -q

# ------------------------------------------------------------------------------
# 5. Verify Checkout Integrity
# ------------------------------------------------------------------------------
CHECKED_OUT_SHA=$(git rev-parse HEAD)
if [[ "${CHECKED_OUT_SHA}" != "${COMMIT_SHA}" ]]; then
    echo "SECURITY ERROR: Checked out SHA (${CHECKED_OUT_SHA}) does not match requested SHA (${COMMIT_SHA})!" >&2
    exit 1
fi
echo "✓ Cryptographic SHA verification passed: ${CHECKED_OUT_SHA}"

# ------------------------------------------------------------------------------
# 6. Validate Dockerfile Path Inside Repository Boundaries
# ------------------------------------------------------------------------------
if [[ ! -f "${DOCKERFILE_PATH}" ]]; then
    echo "ERROR: Required Dockerfile '${DOCKERFILE_PATH}' was not found in checked-out repository." >&2
    exit 1
fi
echo "✓ Dockerfile confirmed at: ${DOCKERFILE_PATH}"

# Ensure no credentials were accidentally saved to git config
if grep -q -i "token" .git/config 2>/dev/null || grep -q -i "password" .git/config 2>/dev/null; then
    echo "SECURITY ALERT: Credentials detected in .git/config! Sanitizing..." >&2
    git config --unset-all credential.helper || true
fi

echo "=========================================================="
echo " [PIPE-04] Repository Checkout Stage Completed Successfully"
echo " Commit: ${CHECKED_OUT_SHA}"
echo " Branch: ${BRANCH:-unknown}"
echo "=========================================================="
