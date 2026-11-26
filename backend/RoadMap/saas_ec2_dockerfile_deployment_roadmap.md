# SaaS Roadmap: Automated EC2 Deployment for Dockerfile Projects (BYOC / BYOS)

> **Document Version:** 1.0.0  
> **Target Scope:** Multi-Tenant SaaS Transformation — Bring Your Own Cloud (AWS EC2)  
> **Application Pattern:** Dockerfile-based repositories only  
> **Target Infrastructure:** User-Supplied AWS EC2 Instance  
> **Status:** Planned / Architecture & Implementation Specification  

---

## 📋 Table of Contents

- [1. Executive Summary & Core Objectives](#1-executive-summary--core-objectives)
- [2. Scope Boundaries & Assumptions](#2-scope-boundaries--assumptions)
- [3. End-to-End System Architecture](#3-end-to-end-system-architecture)
- [4. Data Model & Database Schema Specifications](#4-data-model--database-schema-specifications)
- [5. Detailed Implementation Checklist](#5-detailed-implementation-checklist)
  - [Phase 1: Dockerfile Detection & Repository Gate (SAAS-01)](#phase-1-dockerfile-detection--repository-gate-saas-01)
  - [Phase 2: Encrypted Cloud Credentials & Server Nodes (SAAS-02)](#phase-2-encrypted-cloud-credentials--server-nodes-saas-02)
  - [Phase 3: SSH Connectivity & Security Group Probe (SAAS-03)](#phase-3-ssh-connectivity--security-group-probe-saas-03)
  - [Phase 4: Remote Docker Engine Bootstrap & Runner (SAAS-04)](#phase-4-remote-docker-engine-bootstrap--runner-saas-04)
  - [Phase 5: Build, Run & Container Lifecycle Orchestration (SAAS-05)](#phase-5-build-run--container-lifecycle-orchestration-saas-05)
  - [Phase 6: Live Streaming Logs & Telemetry Capture (SAAS-06)](#phase-6-live-streaming-logs--telemetry-capture-saas-06)
  - [Phase 7: Live App Ingress & Health Verification (SAAS-07)](#phase-7-live-app-ingress--health-verification-saas-07)
- [6. API Specifications & Request/Response Contracts](#6-api-specifications--requestresponse-contracts)
- [7. Frontend UI / UX Workbench Integration](#7-frontend-ui--ux-workbench-integration)
- [8. Security Controls & Threat Modeling](#8-security-controls--threat-modeling)
- [9. Testing & Verification Matrix](#9-testing--verification-matrix)

---

## 1. Executive Summary & Core Objectives

This roadmap defines the architectural and code modifications required to transition the **Intelligent Infrastructure Automation Platform (IIAP)** into a **Multi-Tenant SaaS Platform**. Under this model:

1. **Zero Cloud Hosting Overhead on Platform:** Instead of provisioning and running all user workloads on our centralized Kubernetes cluster, users provide access to their own **AWS EC2 instances**.
2. **Strict Dockerfile-Only Scope:** The platform targets repositories containing a verified `Dockerfile`. Custom buildpacks or multi-language heuristics are bypassed in favor of deterministic, containerized deployments.
3. **Automated Zero-Touch Remote Execution:** Once the user inputs their EC2 host details and credentials, the platform connects over SSH, verifies/installs Docker, pulls the repository code, builds the container image, injects environment variables, and launches the container with automatic restart policies.
4. **Live Observability:** Execution and container runtime output are captured and streamed back to the user's dashboard in real time.

---

## 2. Scope Boundaries & Assumptions

### In-Scope:
- Repositories containing a valid `Dockerfile` at the root (or approved custom subpath).
- Single-instance AWS EC2 deployment targets running supported Linux distributions (`Ubuntu 20.04/22.04/24.04`, `Debian 11/12`, or `Amazon Linux 2023`).
- SSH Key authentication (PEM/OpenSSH private key) with optional AWS IAM credentials.
- Automatic Docker Engine installation if not already present on the target EC2.
- Environment variable injection and port forwarding (`HostPort:ContainerPort`).
- Health checking and automated rollbacks on container startup failure.

### Out-of-Scope (Deferred to Future Milestones):
- Multi-node Kubernetes cluster provisioning on user AWS accounts.
- Automated custom domain DNS creation (Route53 management deferred; direct EC2 IP + port provided first).
- Docker Swarm / Compose multi-container topologies (MVP focuses on single service container + sidecar envs).

---

## 3. End-to-End System Architecture

```
[ User Browser / UI ]
         │  1. Connect Repo + Enter EC2 Details
         ▼
[ IIAP Backend API ]
         │  2. Encrypt SSH Key (AES-256) & Store in DB
         │  3. Verify Dockerfile exists via GitHub API
         │  4. Run Pre-flight SSH Connectivity Check
         ▼
[ EC2 Deployer Engine (SSH2 Agent) ]
         │
         │  5. SSH Handshake (Port 22)
         ▼
┌────────────────────────────────────────────────────────┐
│                   User's AWS EC2                       │
│                                                        │
│  Step A: Probe Docker Engine ──(Install if missing)    │
│  Step B: Create Isolation Workspace (/opt/iiap/apps)   │
│  Step C: Clone/Pull GitHub Source Code                 │
│  Step D: Build Docker Image (`docker build -t app .`)  │
│  Step E: Stop Previous Container (`docker rm -f app`)  │
│  Step F: Run Container (`docker run -d -p 80:3000`)    │
│  Step G: Stream Stdout/Stderr back to Platform         │
└────────────────────────────────────────────────────────┘
         │
         │  6. Stream Logs to Database
         ▼
[ Live App URL: http://<EC2-PUBLIC-IP>:<PORT> ]
```

---

## 4. Data Model & Database Schema Specifications

### Proposed Prisma Schema Updates (`backend/prisma/schema.prisma`)

```prisma
// =========================================================================
// EC2 Target Credentials & Host Configuration
// =========================================================================

enum ec2_auth_type {
  SSH_KEY
  AWS_IAM_CREDENTIALS
}

enum ec2_health_status {
  UNVERIFIED
  ONLINE
  UNREACHABLE
  AUTH_FAILED
}

model ec2_deploy_targets {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  project_id         String             @unique @db.Uuid
  user_id            String             @db.Uuid
  
  // Connection Details
  public_ip          String             // EC2 IPv4 or Public DNS
  ssh_user           String             @default("ubuntu") // ubuntu, ec2-user, debian
  ssh_port           Int                @default(22)
  auth_type          ec2_auth_type      @default(SSH_KEY)
  
  // Encrypted Credentials (AES-256-GCM)
  encrypted_ssh_key  String             @db.Text
  ssh_key_iv         String             @db.VarChar(64)
  ssh_key_tag        String             @db.VarChar(64)
  
  // Optional AWS Provider Credentials (for auto-security group adjustment)
  aws_region         String?            @default("us-east-1")
  encrypted_aws_key  String?            @db.Text
  encrypted_aws_sec  String?            @db.Text
  
  // Runtime Port Routing
  host_port          Int                @default(80)
  container_port     Int                @default(3000)
  
  // Status & Telemetry
  health_status      ec2_health_status  @default(UNVERIFIED)
  last_verified_at   DateTime?          @db.Timestamptz(6)
  docker_version     String?
  created_at         DateTime           @default(now()) @db.Timestamptz(6)
  updated_at         DateTime           @default(now()) @db.Timestamptz(6)
  
  // Relations
  projects           projects           @relation(fields: [project_id], references: [id], onDelete: Cascade)
  users              users              @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([project_id])
  @@index([user_id])
  @@schema("app")
}
```

---

## 5. Detailed Implementation Checklist

### Phase 1: Dockerfile Detection & Repository Gate (SAAS-01)
- [x] **`SAAS-01.1`**: Update GitHub Introspection service to scan repo root and `.docker/` for `Dockerfile` or `dockerfile`.
- [x] **`SAAS-01.2`**: In `POST /api/v1/integrations/github/analyze`, return `hasDockerfile: boolean` and `dockerfilePath: string`.
- [x] **`SAAS-01.3`**: If `hasDockerfile === false`, block deployment initiation and return user-actionable error: `"Repository must contain a Dockerfile to use the EC2 deployment engine."`
- [x] **`SAAS-01.4`**: Allow user to specify a custom Dockerfile path (e.g. `./backend/Dockerfile`) if located in a monorepo or subdirectory.

### Phase 2: Encrypted Cloud Credentials & Server Nodes (SAAS-02)
- [x] **`SAAS-02.1`**: Create encryption utility `src/utils/crypto.service.js` utilizing `AES-256-GCM` with authenticated tags to encrypt and decrypt SSH private keys.
- [x] **`SAAS-02.2`**: Store encryption master key in backend `.env` (`CREDENTIALS_ENCRYPTION_KEY`).
- [x] **`SAAS-02.3`**: Build repository layer `ec2Target.repository.js` to create, read, update, and delete EC2 target records.
- [x] **`SAAS-02.4`**: Ensure private keys are **never** returned in HTTP API responses (sanitize outbound user objects).

### Phase 3: SSH Connectivity & Security Group Probe (SAAS-03)
- [x] **`SAAS-03.1`**: Install `ssh2` package (`npm install ssh2`).
- [x] **`SAAS-03.2`**: Implement `src/modules/deployments/ssh-client.service.js` with 10-second connection timeout handling.
- [x] **`SAAS-03.3`**: Expose validation endpoint `POST /api/projects/:projectId/ec2-verify`:
  - Attempts SSH handshake with supplied credentials.
  - Checks if port 22 is open in the AWS Security Group.
  - Verifies shell user permissions (`sudo -n true` or user in `docker` group).
  - Returns structured diagnostic result (`{ online: true, os: 'Ubuntu 22.04', dockerInstalled: true }`).

### Phase 4: Remote Docker Engine Bootstrap & Runner (SAAS-04)
- [x] **`SAAS-04.1`**: Create idempotent remote setup script `scripts/bootstrap-remote-docker.sh` / `ec2-runner.service.js`:
  - Check if `docker` binary exists in `$PATH`.
  - If missing, run non-interactive official Docker install: `curl -fsSL https://get.docker.com | sh`.
  - Add SSH user to `docker` group (`sudo usermod -aG docker $USER`).
  - Verify Docker daemon is running via `docker info`.
- [x] **`SAAS-04.2`**: Execute bootstrap commands through SSH streaming, piping logs to deployment event stream.

### Phase 5: Build, Run & Container Lifecycle Orchestration (SAAS-05)
- [x] **`SAAS-05.1`**: Create remote application isolation directory structure:
  - Base path: `/opt/iiap/apps/<project-id>/`
  - Workspace: `/opt/iiap/apps/<project-id>/src/`
  - Env file: `/opt/iiap/apps/<project-id>/.env` (permissions `0600`)
- [x] **`SAAS-05.2`**: Git clone or pull latest commit from target repository branch.
- [x] **`SAAS-05.3`**: Write project environment variables into `/opt/iiap/apps/<project-id>/.env`.
- [x] **`SAAS-05.4`**: Execute container build:
  ```bash
  docker build -t iiap-<project-name>:latest -f <dockerfile-path> .
  ```
- [x] **`SAAS-05.5`**: Execute zero-downtime container transition:
  ```bash
  docker stop iiap-<project-name> || true
  docker rm iiap-<project-name> || true
  docker run -d \
    --name iiap-<project-name> \
    --restart unless-stopped \
    -p <host_port>:<container_port> \
    --env-file /opt/iiap/apps/<project-id>/.env \
    iiap-<project-name>:latest
  ```

### Phase 6: Live Streaming Logs & Telemetry Capture (SAAS-06)
- [x] **`SAAS-06.1`**: Stream each command's `stdout` and `stderr` through the SSH session into `deployment_logs` table with sequence timestamps.
- [x] **`SAAS-06.2`**: Automatically redact sensitive strings (tokens, private keys, passwords) before writing to database.
- [x] **`SAAS-06.3`**: Expose Server-Sent Events (SSE) or WebSocket route:
  - `GET /api/deployments/:deploymentId/stream-logs`
- [x] **`SAAS-06.4`**: Support capturing runtime logs via remote `docker logs --tail 100 -f iiap-<project-name>`.

### Phase 7: Live App Ingress & Health Verification (SAAS-07)
- [x] **`SAAS-07.1`**: Once container starts, execute HTTP probe from platform against `http://<ec2-public-ip>:<host_port>/`:
  - Retry up to 5 times with 3-second backoff.
  - Mark deployment `SUCCEEDED` upon HTTP 200-399 status.
  - If container crashes or exits with non-zero code, mark `FAILED` and capture `docker logs`.
- [x] **`SAAS-07.2`**: Update project record with active `live_url: "http://<ec2-public-ip>:<host_port>"`.

---

## 6. API Specifications & Request/Response Contracts

### A. Save / Update EC2 Target Configuration
`POST /api/v1/projects/:projectId/ec2-config`  
**Authentication:** Required (Bearer Token / Cookie)

#### Request Body:
```json
{
  "publicIp": "54.210.120.45",
  "sshUser": "ubuntu",
  "sshPort": 22,
  "sshPrivateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA...",
  "hostPort": 80,
  "containerPort": 3000,
  "dockerfilePath": "Dockerfile"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "targetId": "7b2d56a1-9ef2-487c-b172-849182371902",
    "projectId": "a3b9182c-49f1-47a2-b210-908123746192",
    "publicIp": "54.210.120.45",
    "sshUser": "ubuntu",
    "hostPort": 80,
    "containerPort": 3000,
    "healthStatus": "UNVERIFIED"
  }
}
```

---

### B. Pre-flight Verification Probe
`POST /api/v1/projects/:projectId/ec2-verify`  
**Authentication:** Required

#### Response (200 OK — Success):
```json
{
  "success": true,
  "data": {
    "reachable": true,
    "portOpen": true,
    "authenticated": true,
    "osInfo": "Ubuntu 22.04.3 LTS (GNU/Linux 6.2.0-1018-aws x86_64)",
    "dockerInstalled": true,
    "dockerVersion": "Docker version 26.1.3, build b72afb3",
    "canRunDockerWithoutSudo": true
  }
}
```

#### Response (400 Bad Request — Port 22 Blocked / Security Group issue):
```json
{
  "success": false,
  "error": "SSH_CONNECTION_TIMEOUT",
  "message": "Connection to 54.210.120.45:22 timed out. Please ensure your AWS Security Group allows inbound traffic on port 22."
}
```

---

### C. Trigger EC2 Deployment
`POST /api/v1/projects/:projectId/deploy`  
**Authentication:** Required

#### Request Body:
```json
{
  "branch": "main",
  "environment": "production"
}
```

#### Response (202 Accepted):
```json
{
  "success": true,
  "data": {
    "deploymentId": "e4b10293-8f12-421b-a912-847291847192",
    "status": "QUEUED",
    "target": "AWS_EC2",
    "host": "54.210.120.45:80"
  }
}
```

---

## 7. Frontend UI / UX Workbench Integration

### 1. New Project Setup Wizard (`NewProjectPage.tsx`)
1. **Repository Inspection Card:**
   - Display green glowing badge: `[🐳 Dockerfile Detected]` when repository passes check.
   - If missing, render amber badge: `[⚠️ No Dockerfile Found]` and disable Next step with link to standard Docker templates.
2. **EC2 Connection Form Card:**
   - Input for **Public IPv4 Address**.
   - Input for **SSH Username** (defaulted to `ubuntu`).
   - File picker / text area for **Private Key (.pem / id_rsa)**.
   - Inputs for **External Port (Host)** and **Internal Port (Container)**.
3. **Interactive Verification Button:**
   - `[⚡ Test SSH Connection]` button with real-time ping indicator and error diagnostics.

### 2. Project Details Workbench (`ProjectDetailsPage.tsx`)
- Server Health badge: `[🟢 EC2 Host Online — 54.210.120.45]`.
- Active Container status: `[Running · Up 3 days]`.
- Configuration tab to edit ports, environment variables, and SSH keys.

### 3. Deployment Details & Live Console (`DeploymentDetailsPage.tsx`)
- **Luminous Ingress Banner:** Links directly to `http://54.210.120.45:80` with copyable endpoint.
- **Terminal Execution Stream:** Displays real-time Docker build progress:
  - `Step 1/8: FROM node:20-alpine`
  - `Step 2/8: WORKDIR /app`
  - `Container started successfully on port 80.`

---

## 8. Security Controls & Threat Modeling

| Threat Vector | Mitigation Strategy |
|---|---|
| **Private Key Exposure** | Private keys are encrypted at rest using AES-256-GCM. Decryption occurs only in memory during the active SSH session and is discarded immediately. |
| **Shell Injection via Repo Code** | All remote commands are executed with strict argument arrays; repo name and branch strings are sanitized with strict alphanumeric regexes `^[a-zA-Z0-9_\-\.\/]+$`. |
| **Hanging SSH Sessions** | All SSH sessions enforce socket-level timeouts (15s connection timeout, 10m maximum build timeout). |
| **EC2 Container Escape** | Containers run without `--privileged` flag; root filesystem mounting is forbidden. |
| **Environment Variable Leakage** | `.env` file on EC2 is created with `chmod 0600` owned by the deployment user. |

---

## 9. Testing & Verification Matrix

| Test Suite ID | Test Case | Expected Outcome |
|---|---|---|
| `TEST-EC2-01` | Validate repository without Dockerfile | Reject with HTTP 422 Unprocessable Entity |
| `TEST-EC2-02` | Encrypt & decrypt SSH private key | Ciphertext stored; plaintext key recovered accurately |
| `TEST-EC2-03` | Mock SSH server handshake | Returns system metadata and passes auth gate |
| `TEST-EC2-04` | Automatic Docker installation probe | Executes `curl -fsSL https://get.docker.com` if missing |
| `TEST-EC2-05` | Container port mapping conflict | Detects occupied host port and returns actionable error |
| `TEST-EC2-06` | Live deployment log stream | Captures full Docker build steps with zero secret leaks |
| `TEST-EC2-07` | HTTP Ingress readiness check | Pings live container and marks deployment `SUCCEEDED` |

---

<div align="center">

**IIAP Core Architectural Roadmap · DEPI DevOps Track R5**  
*Maintained under local development environment.*

</div>
