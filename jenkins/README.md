# Jenkins CI/CD Pipeline & PIPE-04 Checkout

This directory contains the pipeline definitions and execution scripts for the **Intelligent Infrastructure Automation Platform**.

---

## 📁 Directory Structure

```
jenkins/
├── Jenkinsfile              # Declarative multi-stage pipeline definition
├── README.md                # Documentation and setup guide
└── scripts/
    └── checkout.sh          # Stage PIPE-04: Isolated, authenticated, commit-verified checkout
```

---

## 🔒 Security Enforcements (PIPE-04 Checklist)

| Requirement | Implementation in `checkout.sh` / `Jenkinsfile` |
| :--- | :--- |
| **Exact Commit SHA** | Checks out exact 40-character commit in detached HEAD mode; verifies with `git rev-parse HEAD`. |
| **Secure GitHub Credentials** | Injected via Jenkins `withCredentials`; passed strictly via memory argument `http.extraHeader`. Never stored in `.git/config`. |
| **Isolated Workspace** | Builds execute in dedicated subfolder `src-repo` inside temporary workspace. |
| **Zero Credential Persistence** | `.git/config` is sanitized, and credentials are never written to disk or printed in logs. |
| **Disk Space Limits** | Verifies minimum available disk space (`MIN_DISK_KB`) before cloning. |
| **Automatic Cleanup** | `cleanWs()` cleans all workspace files and directories in `post { always }`. |
| **Safe Error Handling** | On failure, safe sanitized error is sent to `POST /api/deployments/:id/status`. |

---

## ⚙️ Jenkins Credentials Required

Configure the following credentials in **Jenkins** (`Manage Jenkins` → `Credentials`):

1. **`github-access-token`** (Secret text): GitHub Personal Access Token or GitHub App Token with repository read permissions.
2. **`worker-api-key`** (Secret text): Shared `WORKER_API_KEY` matching your backend's environment configuration.

---

## 🧪 Testing `checkout.sh` Locally

You can test the checkout script in any bash environment:

```bash
export GITHUB_TOKEN="your_personal_access_token_here"

./jenkins/scripts/checkout.sh \
  "https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform.git" \
  "5a1107d391bf395cb2e3fb63dbe927c3ea7eb188" \
  "./tmp-checkout" \
  "Dockerfile"
```
