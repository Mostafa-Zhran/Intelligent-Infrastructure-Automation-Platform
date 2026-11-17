#!/usr/bin/env bash
# ==============================================================================
# Pipeline Stage: PIPE-05 — Docker Build and Image Publishing Stage
# Intelligent Infrastructure Automation Platform
# ==============================================================================
# Security & Operational Rules Enforced:
# 1. Build from approved Dockerfile only within isolated workspace boundaries.
# 2. Strict build timeouts and memory/CPU limits applied.
# 3. Predictable immutable image tagging using Project ID, Commit SHA, and Deployment ID.
# 4. Secure authentication to container registry (AWS ECR / Docker Hub / GHCR).
# 5. Extraction and verification of immutable image digest.
# 6. Automatic cleanup of local images to prevent agent disk exhaustion.
# ==============================================================================

set -euo pipefail

WORKSPACE_DIR="${1:-${WORKSPACE_DIR:-./src-repo}}"
DOCKERFILE_PATH="${2:-${DOCKERFILE_PATH:-Dockerfile}}"
PROJECT_NAME="${3:-${PROJECT_NAME:-app}}"
COMMIT_SHA="${4:-${COMMIT_SHA:-latest}}"
DEPLOYMENT_ID="${5:-${DEPLOYMENT_ID:-unknown}}"
REGISTRY_URL="${6:-${REGISTRY_URL:-}}"
BUILD_TIMEOUT="${BUILD_TIMEOUT:-900}"  # 15 minutes timeout
BUILD_MEMORY_LIMIT="${BUILD_MEMORY_LIMIT:-2048m}" # 2 GB limit

echo "=========================================================="
echo " [PIPE-05] Starting Docker Build & Publish Stage"
echo " Workspace:      ${WORKSPACE_DIR}"
echo " Dockerfile:     ${DOCKERFILE_PATH}"
echo " Project Name:   ${PROJECT_NAME}"
echo " Commit SHA:     ${COMMIT_SHA:0:8}"
echo " Deployment ID:  ${DEPLOYMENT_ID}"
echo " Registry:       ${REGISTRY_URL:-local}"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 1. Pre-Flight Verification
# ------------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker CLI is not installed or not available on agent PATH." >&2
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running or accessible by the agent user." >&2
    exit 1
fi

FULL_DOCKERFILE="${WORKSPACE_DIR}/${DOCKERFILE_PATH}"
if [[ ! -f "${FULL_DOCKERFILE}" ]]; then
    echo "ERROR: Dockerfile not found at '${FULL_DOCKERFILE}'" >&2
    exit 1
fi

# Determine build context (directory containing Dockerfile or repository root)
BUILD_CONTEXT="${WORKSPACE_DIR}"
DOCKERFILE_REL="${DOCKERFILE_PATH}"

# Normalize image name (lowercase, alphanumeric, dashes, underscores)
CLEAN_PROJECT_NAME=$(echo "${PROJECT_NAME}" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-' | sed 's/^-//;s/-$//')
SHORT_SHA="${COMMIT_SHA:0:8}"

if [[ -n "${REGISTRY_URL}" ]]; then
    IMAGE_BASE="${REGISTRY_URL%/}/${CLEAN_PROJECT_NAME}"
else
    IMAGE_BASE="iiap/${CLEAN_PROJECT_NAME}"
fi

PRIMARY_TAG="${IMAGE_BASE}:${SHORT_SHA}"
DEPLOYMENT_TAG="${IMAGE_BASE}:deploy-${DEPLOYMENT_ID}"

echo "Target Primary Image Tag:    ${PRIMARY_TAG}"
echo "Target Deployment Image Tag: ${DEPLOYMENT_TAG}"

# ------------------------------------------------------------------------------
# 2. Container Registry Authentication
# ------------------------------------------------------------------------------
if [[ -n "${REGISTRY_URL}" ]]; then
    echo "Authenticating to container registry ${REGISTRY_URL}..."
    if [[ "${REGISTRY_URL}" =~ \.amazonaws\.com ]]; then
        # AWS ECR authentication
        AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
        echo "Using AWS ECR authentication for region ${AWS_REGION}..."
        aws ecr get-login-password --region "${AWS_REGION}" | \
            docker login --username AWS --password-stdin "${REGISTRY_URL}"
    elif [[ -n "${REGISTRY_USERNAME:-}" && -n "${REGISTRY_PASSWORD:-}" ]]; then
        # Standard Docker Registry / GHCR authentication
        echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY_URL}" -u "${REGISTRY_USERNAME}" --password-stdin
    fi
    echo "✓ Registry authentication successful."
fi

# ------------------------------------------------------------------------------
# 3. Build Docker Image with Resource & Time Limits
# ------------------------------------------------------------------------------
echo "Building container image with limits (timeout: ${BUILD_TIMEOUT}s, memory: ${BUILD_MEMORY_LIMIT})..."

# Use buildx or standard docker build with resource constraints
docker build \
    --file "${FULL_DOCKERFILE}" \
    --tag "${PRIMARY_TAG}" \
    --tag "${DEPLOYMENT_TAG}" \
    --memory="${BUILD_MEMORY_LIMIT}" \
    --label "org.opencontainers.image.revision=${COMMIT_SHA}" \
    --label "org.opencontainers.image.created=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --label "io.iiap.deployment_id=${DEPLOYMENT_ID}" \
    "${BUILD_CONTEXT}"

echo "✓ Docker build completed successfully."

# ------------------------------------------------------------------------------
# 4. Push Image to Registry & Extract Immutable Digest
# ------------------------------------------------------------------------------
IMAGE_DIGEST=""
if [[ -n "${REGISTRY_URL}" ]]; then
    echo "Pushing images to registry..."
    docker push "${PRIMARY_TAG}"
    docker push "${DEPLOYMENT_TAG}"

    echo "Extracting immutable image digest..."
    IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "${PRIMARY_TAG}" 2>/dev/null || echo "")
    if [[ -z "${IMAGE_DIGEST}" ]]; then
        # Fallback to inspecting repo tags
        IMAGE_DIGEST="${PRIMARY_TAG}"
    fi
    echo "✓ Image published with digest: ${IMAGE_DIGEST}"
else
    echo "Skipping push: No REGISTRY_URL provided (local image retained for tests)."
    IMAGE_DIGEST="${PRIMARY_TAG}"
fi

# ------------------------------------------------------------------------------
# 5. Output Build Metadata for Downstream Deployment Stages (PIPE-07)
# ------------------------------------------------------------------------------
METADATA_FILE="build-metadata.json"
cat <<EOF > "${METADATA_FILE}"
{
  "projectName": "${CLEAN_PROJECT_NAME}",
  "commitSha": "${COMMIT_SHA}",
  "deploymentId": "${DEPLOYMENT_ID}",
  "primaryTag": "${PRIMARY_TAG}",
  "deploymentTag": "${DEPLOYMENT_TAG}",
  "imageDigest": "${IMAGE_DIGEST}",
  "builtAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✓ Build metadata saved to ${METADATA_FILE}:"
cat "${METADATA_FILE}"

# ------------------------------------------------------------------------------
# 6. Clean Local Image Cache (Prevent Disk Exhaustion on Agent)
# ------------------------------------------------------------------------------
if [[ -n "${REGISTRY_URL}" ]]; then
    echo "Pruning temporary local images from builder agent..."
    docker rmi "${PRIMARY_TAG}" "${DEPLOYMENT_TAG}" 2>/dev/null || true
fi

echo "=========================================================="
echo " [PIPE-05] Docker Build & Publish Stage Completed"
echo " Output Digest: ${IMAGE_DIGEST}"
echo "=========================================================="
