# 🖥️ Frontend — Intelligent Infrastructure Automation Platform

> React 18 + TypeScript + Vite + Tailwind CSS + Three.js

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Routing](#pages--routing)
- [Components](#components)
- [Services (API Layer)](#services-api-layer)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Build & Deployment](#build--deployment)
- [Design System](#design-system)

---

## 🌟 Overview

The frontend is a single-page application (SPA) built with React 18 and TypeScript. It features a stunning 3D animated landing page using Three.js, a complete authentication flow (sign up, sign in, forgot/reset password), a user profile page, and infrastructure pipeline visualization.

All routing is handled client-side with Vite's SPA rewrite rules.

---

## 🛠️ Tech Stack

| Technology | Version | Role |
|---|---|---|
| **React** | 18.3.x | Core UI framework |
| **TypeScript** | 5.6.x | Static type checking |
| **Vite** | 5.4.x | Build tool & dev server |
| **Tailwind CSS** | 3.4.x | Utility-first CSS framework |
| **Three.js** | 0.186.x | 3D WebGL scenes & animations |
| **Lucide React** | 1.16.x | SVG icon library |
| **PostCSS** | 8.4.x | CSS post-processing |
| **Autoprefixer** | 10.4.x | CSS vendor prefixes |

---

## 📁 Project Structure

```
frontend/
├── 📄 index.html               # HTML entry point
├── 📄 vite.config.ts           # Vite configuration (proxy, plugins)
├── 📄 tailwind.config.js       # Tailwind theme customization
├── 📄 tsconfig.json            # TypeScript compiler config
├── 📄 tsconfig.node.json       # TypeScript config for Vite
├── 📄 postcss.config.js        # PostCSS plugins
├── 📄 vercel.json              # Vercel SPA rewrite rules
├── 📄 .env.example             # Environment variable template
│
└── 📂 src/
    ├── 📄 main.tsx             # ReactDOM entry point
    ├── 📄 App.tsx              # Root component + client-side routing
    ├── 📄 index.css            # Global CSS, design tokens, animations
    ├── 📄 vite-env.d.ts        # Vite environment type declarations
    │
    ├── 📂 pages/               # Full-page route components
    │   ├── 📄 LandingPage.tsx       # Hero + 3D scene + feature sections
    │   ├── 📄 SignInPage.tsx        # Login form
    │   ├── 📄 SignUpPage.tsx        # Registration form
    │   ├── 📄 ForgotPasswordPage.tsx # Request password reset email
    │   ├── 📄 ResetPasswordPage.tsx  # New password form (token-based)
    │   ├── 📄 ProfilePage.tsx        # User profile & account settings
    │   └── 📄 NoAccessPage.tsx       # 403 / access denied page
    │
    ├── 📂 components/
    │   ├── 📂 3d/              # Three.js 3D components
    │   │   └── 📄 InfrastructureScene3D.tsx  # Main 3D hero animation
    │   ├── 📂 ui/              # Reusable UI primitives
    │   │   └── 📄 InputField.tsx    # Styled form input component
    │   ├── 📂 layout/          # Layout & shell components
    │   └── 📂 pipeline/        # CI/CD pipeline visualization
    │
    ├── 📂 services/            # API communication layer
    │   └── 📄 *.ts             # Typed API service functions
    │
    └── 📂 types/               # Shared TypeScript type definitions
        └── 📄 *.ts
```

---

## 🗺️ Pages & Routing

| Route | Component | Description | Auth Required |
|---|---|---|---|
| `/` | `LandingPage` | Hero section with 3D animation, features, CTA | ❌ |
| `/signin` | `SignInPage` | Email + password login form | ❌ |
| `/signup` | `SignUpPage` | Registration form with validation | ❌ |
| `/forgot-password` | `ForgotPasswordPage` | Email input to trigger reset flow | ❌ |
| `/reset-password` | `ResetPasswordPage` | Token-authenticated new password form | ❌ |
| `/profile` | `ProfilePage` | User profile, update info, change password | ✅ |
| `/no-access` | `NoAccessPage` | 403 error page | ❌ |

---

## 🧩 Components

### `3d/InfrastructureScene3D.tsx`
Three.js powered WebGL scene rendered on the landing page hero section. Features animated 3D infrastructure nodes, particles, and connection lines representing an infrastructure topology.

### `ui/InputField.tsx`
A reusable, accessible form input component with:
- Label & error message support
- Icon slot (left/right)
- Controlled & uncontrolled modes
- Tailwind-based dark styling

### `layout/`
Contains shell components like navigation bars, sidebars, and page wrappers.

### `pipeline/`
Components for visualizing CI/CD pipeline stages, step status indicators, and deployment logs.

---

## 🔗 Services (API Layer)

The `src/services/` directory contains typed functions for communicating with the backend REST API. All requests are made relative to the `Backend_API` environment variable (or via Vite proxy in development).

Example service shape:
```ts
// services/auth.service.ts
export const signIn = (credentials: SignInPayload): Promise<AuthResponse> => ...
export const getProfile = (): Promise<UserProfile> => ...
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- npm v9+

### Steps

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env if you have a non-local backend

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🔑 Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Backend API URL
# Leave empty in local dev (Vite proxy is used automatically)
# Set to your deployed backend URL in production
Backend_API=

# Production example:
# Backend_API=https://your-backend.railway.app
```

### Vite Proxy (Local Development)
In `vite.config.ts`, API calls to `/api` are proxied to `http://localhost:3000`, so no `Backend_API` value is needed locally.

---

## 📜 Available Scripts

Run these from the `frontend/` directory:

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check + build production bundle to `dist/` |
| `npm run preview` | Serve the production `dist/` build locally |

---

## 🚀 Build & Deployment

### Production Build

```bash
npm run build
# Output: frontend/dist/
```

### Deploy to Vercel

The `vercel.json` in the `frontend/` directory configures SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Steps:**
1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Set the **Root Directory** to `frontend`
3. Set the **Build Command** to `npm run build`
4. Set the **Output Directory** to `dist`
5. Add the `Backend_API` environment variable in Vercel's dashboard

---

## 🎨 Design System

### Color Palette
The app uses a dark-mode first design system defined in `tailwind.config.js` and `index.css`:

- **Primary**: Cyan / Electric Blue gradient (`#06b6d4` → `#3b82f6`)
- **Background**: Deep navy (`#0a0f1e` → `#0d1117`)
- **Surface**: Glass cards with backdrop blur
- **Text**: White / Gray-300 hierarchy

### Typography
- **Font**: System sans-serif stack (Inter-inspired)
- **Scale**: Tailwind's default type scale

### Animations
- 3D particle field on the landing page (Three.js)
- CSS keyframe animations for fade-in, slide-up, and pulse effects
- Tailwind `transition` utilities for hover/focus states
- Glassmorphism cards with `backdrop-filter: blur()`

---

> For full project documentation, see the [main repository README](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform#readme).
