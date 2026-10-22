# 🚀 Intelligent Infrastructure Automation Platform

> A modern, full-stack DevOps automation platform with AI-driven infrastructure management, complete authentication, profile management, and automated CI/CD pipelines.

![Project Documentation Guidelines](./project-documentation-guidelines.jpeg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Project Timeline](#project-timeline)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

The **Intelligent Infrastructure Automation Platform** is a full-stack web application designed to automate and intelligently manage DevOps infrastructure. It combines AI-driven recommendations, automated CI/CD pipeline orchestration, and a robust authentication system — all wrapped in a sleek, modern 3D-animated UI.

Built as part of the **DEPI DevOps Track (R5)** program, this platform demonstrates real-world DevOps practices including infrastructure automation, policy-based action approvals, and multi-environment deployment management.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.x | UI Framework |
| TypeScript | 5.6.x | Type Safety |
| Vite | 5.4.x | Build Tool & Dev Server |
| Tailwind CSS | 3.4.x | Utility-first Styling |
| Three.js | 0.186.x | 3D Animations & Scenes |
| Lucide React | 1.16.x | Icon Library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime Environment |
| Express | 5.3.x | Web Framework |
| Prisma ORM | 7.10.x | Database ORM |
| PostgreSQL | 14+ | Relational Database |
| JWT | 9.0.x | Authentication Tokens |
| bcrypt | 6.0.x | Password Hashing |
| Nodemailer | 10.x | Email (SMTP) |
| Resend | 6.x | Transactional Emails |
| Joi | 18.x | Request Validation |

---

## 📁 Project Structure

```
Intelligent Infrastructure Automation Platform/
├── 📄 README.md                         # This file
├── 📄 package.json                      # Root workspace scripts
├── 📄 vercel.json                       # Vercel deployment config
├── 📄 .gitignore
├── 🖼️  project-documentation-guidelines.jpeg
│
├── 📂 frontend/                         # React + TypeScript + Vite App
│   ├── 📄 index.html
│   ├── 📄 vite.config.ts
│   ├── 📄 tailwind.config.js
│   ├── 📄 tsconfig.json
│   └── 📂 src/
│       ├── 📄 App.tsx                   # Root component & routing
│       ├── 📄 main.tsx                  # Entry point
│       ├── 📄 index.css                 # Global styles
│       ├── 📂 pages/                    # Page components
│       ├── 📂 components/              # Reusable components
│       │   ├── 📂 3d/                  # Three.js 3D scenes
│       │   ├── 📂 ui/                  # UI primitives
│       │   ├── 📂 layout/              # Layout components
│       │   └── 📂 pipeline/            # Pipeline components
│       ├── 📂 services/                # API service layer
│       └── 📂 types/                   # TypeScript types
│
└── 📂 backend/                          # Node.js + Express API
    ├── 📄 server.js                     # Entry point
    ├── 📄 package.json
    ├── 📄 prisma.config.js
    ├── 📂 prisma/
    │   ├── 📄 schema.prisma             # Database schema
    │   └── 📂 migrations/
    ├── 📂 generated/                    # Prisma generated client
    └── 📂 src/
        ├── 📄 app.js                    # Express app setup
        ├── 📄 server.js                 # HTTP server
        ├── 📂 config/                   # App configuration (CORS, etc.)
        ├── 📂 db/                       # Database connection
        ├── 📂 middleware/               # Express middlewares
        ├── 📂 modules/
        │   └── 📂 auth/                 # Auth module (MVC pattern)
        └── 📂 utils/                    # Utility functions
```

---

## ✨ Features

### 🔐 Authentication & Security
- **Sign Up / Sign In** with JWT-based stateless authentication
- **Password Reset** via secure email token (15-min TTL)
- **Change Password** with current password verification
- **HTTP-only cookie** session management
- **Bcrypt** password hashing (cost factor 12)
- **Joi** request validation on all endpoints

### 👤 User Profile Management
- View and update user profile (name, email)
- Avatar support
- Account settings

### 🤖 Infrastructure Automation (Platform Core)
- **AI Action Recommendations** — Intelligent suggestions for infrastructure changes
- **Policy-based Approval Workflows** — Risk-level-aware approval gates (LOW / MEDIUM / HIGH)
- **Multi-environment Support** — Development, staging, production
- **Deployment Pipeline Tracking** — Real-time pipeline status
- **Action Audit Trail** — Full history of all infrastructure actions

### 🎨 UI / UX
- Stunning **3D animated landing page** powered by Three.js
- Dark-mode first design with glassmorphism effects
- Fully **responsive** layout (mobile → desktop)
- Smooth page transitions and micro-animations
- No-access / 404 guard pages

---

## ✅ Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** v18 or higher → [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (bundled with Node.js)
- **PostgreSQL** v14 or higher → [postgresql.org](https://www.postgresql.org)
- **Git** → [git-scm.com](https://git-scm.com)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform.git
cd Intelligent-Infrastructure-Automation-Platform
```

### 2. Set Up the Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start the development server
npm run dev
```

> The backend API runs on **http://localhost:3000**

### 3. Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env

# Start the development server
npm run dev
```

> The frontend dev server runs on **http://localhost:5173**

### 4. (Optional) Run Both from Root

```bash
# In two separate terminals from the project root:
npm run dev:backend
npm run dev:frontend
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=app` |
| `JWT_ACCESS_SECRET` | JWT signing secret (keep secret!) | `your_super_secret_key` |
| `JWT_ACCESS_EXPIRES_IN` | JWT expiry duration | `15m` |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Password reset link TTL | `15` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_USER` | Sender email | `you@gmail.com` |
| `SMTP_PASS` | Gmail app password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Display name + email | `"Platform <you@gmail.com>"` |
| `RESEND_API_KEY` | Resend API key (optional) | `re_xxxxx` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `Backend_API` | Backend API base URL | `https://your-api.railway.app` |

> **Note:** Leave `Backend_API` empty during local development — Vite proxy will handle it automatically.

---

## 🔌 API Overview

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | ❌ | Register new user |
| `POST` | `/auth/signin` | ❌ | Login & receive JWT |
| `POST` | `/auth/signout` | ❌ | Clear session cookie |
| `POST` | `/auth/forgot-password` | ❌ | Send password reset email |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |
| `GET` | `/auth/profile` | ✅ | Get current user profile |
| `PATCH` | `/auth/profile` | ✅ | Update user profile |
| `PATCH` | `/auth/change-password` | ✅ | Change account password |

> See [`backend/README.md`](./backend/README.md) for full API documentation.

---

## 🌐 Deployment

### Frontend — Vercel

The frontend is configured for Vercel deployment with SPA rewrites:

```bash
cd frontend
npm run build
# Deploy the dist/ folder to Vercel
```

Or connect your GitHub repo to Vercel — it will auto-detect the Vite project.

### Backend — Railway / Render

1. Create a new project on [Railway](https://railway.app) or [Render](https://render.com)
2. Set all required environment variables from `backend/.env.example`
3. Set the start command to `npm start`
4. Ensure `npx prisma generate` runs during build (handled by `postinstall` script)

---

## 📅 Project Timeline (DEPI Guidelines)

| Milestone | DEPI Industry | DEPI Deadline |
|---|---|---|
| Project Planning & Management | 2 Oct 2026 | 16 Oct 2026 |
| Literature Review | 9 Oct 2026 | 16 Oct 2026 |
| Requirements Gathering | 9 Oct 2026 | 16 Oct 2026 |
| System Analysis & Design | 9 Oct 2026 | 6 Nov 2026 |
| Implementation (Source Code & Execution) | 16 Oct 2026 | 30 Nov 2026 |
| Final Presentation & Testing & Reports | 16 Oct 2026 | 4 Dec 2026 |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with ❤️ for DEPI DevOps Track R5**

[GitHub](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform) · [Report Bug](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform/issues) · [Request Feature](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform/issues)

</div>
