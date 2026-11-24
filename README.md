# 🚀 Intelligent Infrastructure Automation Platform (IIAP)

> **Enterprise-grade, end-to-end autonomous DevOps platform.** Connect GitHub repositories, analyze software stacks, provision secure cloud infrastructure with Terraform & Ansible, and execute automated zero-downtime Kubernetes rollouts with real-time live telemetry.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](#)
[![Unit Tests](https://img.shields.io/badge/tests-156%2F156%20passing-emerald.svg?style=flat-square)](#-automated-testing-suite)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square&logo=typescript)](#)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg?style=flat-square&logo=node.js)](#)
[![Express](https://img.shields.io/badge/Express-5.3-black.svg?style=flat-square&logo=express)](#)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748.svg?style=flat-square&logo=prisma)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1.svg?style=flat-square&logo=postgresql)](#)
[![Terraform](https://img.shields.io/badge/Terraform-1.6%2B-7B42BC.svg?style=flat-square&logo=terraform)](#)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28%2B-326CE5.svg?style=flat-square&logo=kubernetes)](#)
[![Swagger](https://img.shields.io/badge/OpenAPI-3.0-85EA2D.svg?style=flat-square&logo=swagger)](#-api--swagger-documentation)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=flat-square)](#-license)

![Project Documentation Guidelines](./project-documentation-guidelines.jpeg)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture & 7-Stage Pipeline Contract](#-architecture--7-stage-pipeline-contract)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Directory Layout](#-project-directory-layout)
- [API & Swagger Documentation](#-api--swagger-documentation)
- [Environment Variables](#-environment-variables)
- [Quick Start & Local Development](#-quick-start--local-development)
- [Automated Testing Suite](#-automated-testing-suite)
- [Production Deployment](#-production-deployment)
- [Project Timeline (DEPI Guidelines)](#-project-timeline-depi-guidelines)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

The **Intelligent Infrastructure Automation Platform (IIAP)** is a modern full-stack web and cloud automation application engineered as part of the **DEPI DevOps Track (R5)** program. 

The platform bridges the gap between software source code and production-grade cloud infrastructure:
1. **Git & Repo Analysis:** Connects to GitHub via OAuth, introspecting repositories to detect project frameworks, dockerfiles, build configurations, and required environment parameters.
2. **Infrastructure as Code (IaC):** Executes validated, least-privilege Terraform modules (`AWS-01`, `AWS-02`) with encrypted remote S3 state storage and DynamoDB locking.
3. **Configuration Hardening:** Automatically runs Ansible playbooks (`ANS-01`) enforcing strict SSH hardening, root login prevention, and Docker daemon log rotation.
4. **Cloud-Native Deployment:** Rolls out containerized workloads into Kubernetes (K3s / AWS EKS) with automatic zero-downtime rollouts, health probes, and live ingress routing.
5. **Real-time Observability & UI Workbench:** Offers a dark engineering workbench with 3D Cyber-Infrastructure visualizer (Three.js), live execution console stream, and user profile management.

---

## 🏗️ Architecture & 7-Stage Pipeline Contract

Every project deployment submitted through the platform is processed through a strict, deterministic 7-stage CI/CD execution pipeline:

```
[ Git Push / Trigger ]
         │
         ▼
 ┌─────────────────┐
 │ PIPE-01: LINT   │  Code Quality, Security Scanning & Syntax Verification
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-02: BUILD  │  Container Build & Vulnerability Scan (Trivy / Hadolint)
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-03: PUSH   │  Publish Immutable Image to Container Registry (GHCR / ECR)
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-04: ANSIBLE│  Hardened Host Provisioning, SSH Hardening & Docker Daemon
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-05: TF PLAN│  Terraform Plan Generation & Resource Delta Verification
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-06: TF APPL│  Terraform Apply, Remote S3 State & DynamoDB Lock
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ PIPE-07: K8S    │  Kubernetes (EKS/K3s) Manifest Apply & Zero-Downtime Rollout
 └─────────────────┘
          │
          ▼
[ Production Live Ingress ]
```

- **Security By Design:** Sensitive credentials (AWS keys, GitHub tokens, database passwords) are injected exclusively through backend secrets and environment managers — never passed as plaintext arguments or committed into git.
- **State Locking:** Remote state corruption is prevented using AWS DynamoDB table state locks and AES-256 S3 bucket server-side encryption.

---

## ✨ Key Features

### 🐙 GitHub OAuth & Workload Discovery
- **Secure OAuth Handshake:** GitHub integration with CSRF state verification and AES-256-CBC token encryption at rest.
- **Repository Introspection:** Real-time fetching of organizations, repositories, branches, and commits.
- **Smart Tech Stack Detection:** Analyzes repo trees to detect frameworks (Node.js, Python, Docker, Go, Static HTML/React).

### 🚀 Workload & Deployment Studio
- **Multi-Environment Support:** Segregated workspaces for `development`, `staging`, and `production`.
- **Project Workbench:** Unified split workbench with live topology preview, environment variable management, and deployment history.
- **Live Logs Studio:** Real-time log streaming terminal with auto-scroll, search filters, and automatic secret redaction.
- **Luminous Ingress Banner:** Prominent high-contrast ingress routing preview with active service endpoints and port mappings.

### 🔐 Enterprise Authentication & Profile Management
- **Stateless JWT Sessions:** Dual-token authentication (short-lived access token + 7-day refresh token in HTTP-only cookies).
- **Password Recovery:** Time-limited (15 min TTL) cryptographically secure password reset flow with email notification.
- **Profile Image & Avatar Upload:**
  - Dedicated `POST /api/v1/auth/profile/avatar` endpoint with base64 data URI and URL support.
  - Client-side canvas image optimization (auto-scaled to crisp 1024px High-DPI).
  - Prominent 128px profile frame with neon gradient border and instant hover triggers.
  - Avatar visibility across navigation headers, mobile menus, and dropdowns.

### 🎨 Visual Identity & 3D Engineering Design
- **Autonomous Infrastructure Nexus Logo:** Modern 3D isometric brand logo uniting cloud layers, containers, and a glowing AI core.
- **Interactive 3D Visualizer:** Three.js cyber-infrastructure scene with responsive viewport fitting.
- **High-Density Dark Theme:** Engineered with `#07070D` / `#090A14` backgrounds, glassmorphism, and Violet/Cyan luminous accents.

---

## 🛠️ Tech Stack

### Frontend Architecture
| Layer | Technologies | Description |
|---|---|---|
| **Framework** | React 18.3, TypeScript 5.6 | Strict type-checked component architecture |
| **Tooling** | Vite 5.4, PostCSS, Tailwind CSS | Lightning-fast HMR and utility-first styling |
| **3D & Graphics** | Three.js 0.186 | Interactive cyber-infrastructure visual scene |
| **Data Viz** | Recharts 2.15 | Deployment velocity & system performance graphs |
| **Icons** | Lucide React | Clean, modern developer iconography |

### Backend Architecture
| Layer | Technologies | Description |
|---|---|---|
| **Runtime & Server** | Node.js 18+, Express 5.3 | High-performance modular REST API |
| **Database & ORM** | PostgreSQL 14+, Prisma ORM 7.10 | Type-safe queries, migration management |
| **Driver Adapter** | `@prisma/adapter-pg`, `pg 8.23` | Native pooler support (Supabase / AWS RDS) |
| **Security & Crypto** | `bcrypt 6.0`, `jsonwebtoken 9.0` | Cost factor 12 password hashing & signed tokens |
| **Validation** | Joi 18.2 | Strict schema validation on all incoming requests |
| **Documentation** | Swagger UI, swagger-jsdoc | OpenAPI 3.0 specification & interactive UI |
| **Email Delivery** | Nodemailer 10.1, Resend 6.33 | Transactional emails for password resets |

---

## 📁 Project Directory Layout

```
Intelligent-Infrastructure-Automation-Platform/
├── 📄 README.md                                 # Comprehensive platform documentation
├── 📄 package.json                              # Root workspace scripts
├── 📄 vercel.json                               # Production SPA rewrite configuration
├── 📄 .gitignore
│
├── 📂 frontend/                                 # React 18 + TypeScript + Vite SPA
│   ├── 📄 index.html                            # App entry with Nexus SVG Favicon
│   ├── 📄 vite.config.ts                        # Dev server & build configuration
│   ├── 📄 tailwind.config.js                    # Custom theme & color extensions
│   ├── 📄 tsconfig.json                         # Strict TypeScript configuration
│   └── 📂 src/
│       ├── 📄 App.tsx                           # App shell, routing & auth state
│       ├── 📄 main.tsx                          # DOM mount entry
│       ├── 📄 index.css                         # Tailored styles & glassmorphism
│       ├── 📂 components/
│       │   ├── 📂 common/                       # BrandLogo & ProjectIcon SVGs
│       │   ├── 📂 layout/                       # Header, Footer navigation
│       │   ├── 📂 3d/                           # Three.js Infrastructure scene
│       │   └── 📂 ui/                           # Button, GlassCard, Input primitives
│       ├── 📂 pages/                            # Landing, Dashboard, Projects, Deployments, Profile
│       ├── 📂 services/                         # Type-safe API client layer
│       └── 📂 types/                            # Core TypeScript interfaces
│
├── 📂 backend/                                  # Node.js + Express 5 REST API
│   ├── 📄 server.js                             # HTTP server bootstrap
│   ├── 📄 package.json                          # Dependencies & test runners
│   ├── 📄 prisma.config.js                      # Prisma CLI configuration
│   ├── 📂 prisma/
│   │   ├── 📄 schema.prisma                     # Complete PostgreSQL relational schema
│   │   └── 📂 migrations/                       # Incremental SQL migration history
│   ├── 📂 src/
│   │   ├── 📄 app.js                            # Express pipeline & CORS configuration
│   │   ├── 📂 config/                           # Swagger & CORS configs
│   │   ├── 📂 db/                               # Prisma client connection singleton
│   │   ├── 📂 middleware/                       # JWT auth, Joi validation, error handlers
│   │   ├── 📂 modules/                          # Domain-driven architecture
│   │   │   ├── 📂 auth/                         # Authentication, passwords, avatars
│   │   │   ├── 📂 dashboard/                    # Telemetry aggregation & metrics
│   │   │   ├── 📂 deployments/                  # Pipeline execution & status tracking
│   │   │   ├── 📂 integrations/github/          # GitHub OAuth & repository sync
│   │   │   └── 📂 projects/                     # Workload services & specs
│   │   └── 📂 utils/                            # Email, encryption, and logger utilities
│   └── 📂 tests/unit/                           # 156 comprehensive unit test suites
│
├── 📂 terraform/                                # Infrastructure as Code Modules
│   ├── 📂 environments/dev/                     # Root dev environment composition
│   └── 📂 modules/                              # VPC, EKS, and IAM security modules
│
├── 📂 ansible/                                  # Server Provisioning & Hardening
│   ├── 📄 ansible.cfg                           # Hardened Ansible configuration
│   ├── 📂 inventory/                            # Dynamic environment hosts
│   ├── 📂 playbooks/site.yml                    # Pipeline execution playbook
│   └── 📂 roles/common/                         # SSH & OS baseline hardening
│
└── 📂 k8s/                                      # Kubernetes Base Manifests
    ├── 📄 deployment.yaml                       # Least-privilege container pods
    ├── 📄 service.yaml                          # ClusterIP service definitions
    ├── 📄 ingress.yaml                          # HTTP/HTTPS routing specifications
    └── 📄 serviceaccount.yaml                   # Token mounting disabled by default
```

---

## 🔌 API & Swagger Documentation

The platform includes full interactive OpenAPI 3.0 documentation.

- **Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI JSON Spec:** [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

### Core REST Endpoints

| Module | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/signup` | ❌ | Create new user account |
| **Auth** | `POST` | `/api/v1/auth/signin` | ❌ | Authenticate & issue JWT cookie/token |
| **Auth** | `POST` | `/api/v1/auth/signout` | ❌ | Invalidate session & clear cookies |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | ❌ | Dispatch 15-min password reset link |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | ❌ | Reset password with verification token |
| **Auth** | `GET` | `/api/v1/auth/profile` | ✅ | Fetch authenticated user details |
| **Auth** | `PATCH` | `/api/v1/auth/profile` | ✅ | Update name, email, or avatar |
| **Auth** | `POST` | `/api/v1/auth/profile/avatar` | ✅ | Upload/replace user avatar image |
| **Auth** | `PATCH` | `/api/v1/auth/change-password` | ✅ | Change current password |
| **GitHub** | `GET` | `/api/v1/integrations/github/auth-url` | ✅ | Generate GitHub OAuth authorize URL |
| **GitHub** | `GET` | `/api/v1/integrations/github/callback` | ❌ | Exchange OAuth code & encrypt token |
| **GitHub** | `GET` | `/api/v1/integrations/github/status` | ✅ | Check user GitHub connection status |
| **GitHub** | `DELETE`| `/api/v1/integrations/github/disconnect`| ✅ | Revoke GitHub integration |
| **GitHub** | `GET` | `/api/v1/integrations/github/repos` | ✅ | List accessible repositories |
| **GitHub** | `GET` | `/api/v1/integrations/github/branches` | ✅ | List repository branches |
| **GitHub** | `POST`| `/api/v1/integrations/github/analyze` | ✅ | Auto-detect repo framework & stack |
| **Projects**| `GET` | `/api/projects` | ✅ | List user workload projects |
| **Projects**| `POST`| `/api/projects` | ✅ | Create new project workspace |
| **Projects**| `GET` | `/api/projects/:id` | ✅ | Get workload configuration & status |
| **Deploy** | `GET` | `/api/deployments` | ✅ | List paginated deployment runs |
| **Deploy** | `POST`| `/api/deployments` | ✅ | Dispatch deployment pipeline run |
| **Deploy** | `GET` | `/api/deployments/:id` | ✅ | Get pipeline stages, events & status |
| **Deploy** | `GET` | `/api/deployments/:id/logs`| ✅ | Stream redacted execution logs |
| **Dashboard**| `GET`| `/api/dashboard` | ✅ | Aggregated platform metrics |

---

## 🔑 Environment Variables

### Backend Configuration (`backend/.env`)

```ini
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL / Supabase)
DATABASE_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:5432/postgres"

# JWT Authentication
JWT_ACCESS_SECRET="your-super-strong-jwt-secret-key"
JWT_ACCESS_EXPIRES_IN="15m"
PASSWORD_RESET_TOKEN_TTL_MINUTES=15

# GitHub OAuth Integration
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"
GITHUB_OAUTH_REDIRECT_URI="http://localhost:3000/api/v1/integrations/github/callback"
GITHUB_OAUTH_STATE_TTL_MINUTES=10
GITHUB_TOKEN_ENCRYPTION_KEY="32-byte-base64-encryption-key="
GITHUB_OAUTH_SCOPES="read:user read:org repo"

# Transactional Email (Optional for local testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="IIAP Automation <no-reply@iiap.dev>"
```

### Frontend Configuration (`frontend/.env`)

```ini
# Backend API Base URL (Leave empty in local dev to use Vite proxy)
Backend_API=
```

---

## 🚀 Quick Start & Local Development

### 1. Clone & Install

```bash
git clone https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform.git
cd Intelligent-Infrastructure-Automation-Platform

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### 2. Configure Database & Environment

1. Create a PostgreSQL database (e.g. via [Supabase](https://supabase.com) or local PostgreSQL).
2. Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL` and `JWT_ACCESS_SECRET`.
3. Generate the Prisma Client and run migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

### 3. Launch the Platform

Open two terminal windows:

**Terminal 1 — Backend API:**
```bash
cd backend
npm run dev
# Running on http://localhost:3000
# OpenAPI Docs: http://localhost:3000/api-docs
```

**Terminal 2 — Frontend App:**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## 🧪 Automated Testing Suite

The repository contains **156 automated unit tests** built with the native Node.js test runner covering infrastructure security, pipeline integrity, and backend APIs:

```bash
cd backend
npm test
```

### Test Coverage Highlights
- `ANS-01`: Ansible playbooks, SSH hardening, and host key verification.
- `AWS-01`: S3 remote state encryption (AES256), public access block, and DynamoDB lock tables.
- `AWS-02`: EKS cluster security, least-privilege IAM roles, and OIDC IRSA configurations.
- `PIPE-06`: Terraform runner bash safety, directory traversal prevention, and secret redaction.
- `PIPE-07`: Kubernetes manifests, security contexts, and container capability drops.
- `DEP-01..04`: Deployment pagination, authorization gates, and GitHub Actions fallback streaming.
- `SETUP-01..05`: GitHub OAuth state cryptographic verification, repository analysis, and project setup.

---

## 🌐 Production Deployment

### Frontend (Vercel)
The frontend is configured with SPA catch-all rewrites in [vercel.json](./vercel.json):
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend (Railway / Render / AWS ECS)
1. Deploy the `backend/` directory as a Node.js web service.
2. Supply environment variables in the platform dashboard.
3. Start command: `npm start` (automatically generates Prisma client on postinstall).

---

## 📅 Project Timeline (DEPI Guidelines)

| Phase | Milestone Description | DEPI Industry Start | DEPI Deadline | Status |
|:---:|---|:---:|:---:|:---:|
| **1** | Project Planning & Management | 2 Oct 2026 | 16 Oct 2026 | ✅ Completed |
| **2** | Literature Review | 9 Oct 2026 | 16 Oct 2026 | ✅ Completed |
| **3** | Requirements Gathering | 9 Oct 2026 | 16 Oct 2026 | ✅ Completed |
| **4** | System Analysis & Design | 9 Oct 2026 | 6 Nov 2026 | ✅ Completed |
| **5** | Implementation (Source Code & CI/CD Pipeline) | 16 Oct 2026 | 30 Nov 2026 | ✅ Completed |
| **6** | Final Presentation, Testing & Reports | 16 Oct 2026 | 4 Dec 2026 | 🚀 In Progress |

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your Changes: `git commit -m 'feat: add AmazingFeature'`
4. Push to the Branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with pride for the DEPI DevOps Track R5**

[GitHub Repository](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform) · [Issue Tracker](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform/issues)

</div>
