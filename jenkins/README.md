# Jenkins CI/CD Pipeline — PIPE-04 & PIPE-05

This directory contains the pipeline definitions and execution scripts for the **Intelligent Infrastructure Automation Platform**.

---

## 📁 Directory Structure

```
jenkins/
├── Jenkinsfile              # Declarative multi-stage pipeline definition
├── README.md                # Documentation and setup guide
└── scripts/
    ├── checkout.sh          # Stage PIPE-04: Isolated, authenticated, commit-verified checkout
    └── build-and-push.sh    # Stage PIPE-05: Docker build, resource limits, tagging, and ECR/Registry push
```

---

## 🔒 Security & Operational Enforcements

### PIPE-04: Secure Checkout
| Requirement | Implementation in `checkout.sh` / `Jenkinsfile` |
| :--- | :--- |
| **Exact Commit SHA** | Checks out exact 40-character commit in detached HEAD mode; verifies with `git rev-parse HEAD`. |
| **Secure GitHub Credentials** | Injected via Jenkins `withCredentials`; passed strictly via memory argument `http.extraHeader`. Never stored in `.git/config`. |
| **Isolated Workspace** | Builds execute in dedicated subfolder `src-repo` inside temporary workspace. |
| **Zero Credential Persistence** | `.git/config` is sanitized, and credentials are never written to disk or printed in logs. |
| **Disk Space Limits** | Verifies minimum available disk space (`MIN_DISK_KB`) before cloning. |
| **Automatic Cleanup** | `cleanWs()` cleans all workspace files and directories in `post { always }`. |

### PIPE-05: Docker Build & Image Publishing
| Requirement | Implementation in `build-and-push.sh` / `Jenkinsfile` |
| :--- | :--- |
| **Approved Dockerfile** | Builds strictly using validated `$DOCKERFILE_PATH` within repository boundaries. |
| **Resource & Timeout Limits** | Applies `--memory=2048m` and `15m` timeout to prevent agent denial of service. |
| **Predictable Tagging** | Dual-tags image with commit SHA (`:shortSha`) and deployment ID (`:deploy-ID`). |
| **Secure Registry Login** | Authenticates securely to AWS ECR (`aws ecr get-login-password`) or Docker Hub via stdin. |
| **Immutable Digest** | Extracts and saves immutable image digest to `build-metadata.json`. |
| **Agent Pruning** | Prunes local image tags immediately after push to prevent builder disk exhaustion. |

---

## ⚙️ Jenkins Credentials Required

Configure the following credentials in **Jenkins** (`Manage Jenkins` → `Credentials`):

1. **`github-access-token`** (Secret text): GitHub Token for repository checkout.
2. **`worker-api-key`** (Secret text): Shared `WORKER_API_KEY` for backend callbacks.
3. **`container-registry-credentials`** (Username with password): Docker Registry / AWS credentials for pushing images.

---

## 🧪 Testing Locally

### Test Checkout:
```bash
./jenkins/scripts/checkout.sh \
  "https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform.git" \
  "5a1107d391bf395cb2e3fb63dbe927c3ea7eb188" \
  "./tmp-checkout" \
  "Dockerfile"
```

### Test Docker Build & Push:
```bash
./jenkins/scripts/build-and-push.sh \
  "./tmp-checkout" \
  "Dockerfile" \
  "my-app" \
  "5a1107d391bf395cb2e3fb63dbe927c3ea7eb188" \
  "deploy-uuid-001" \
  "" # Leave empty for local test build without pushing
```
