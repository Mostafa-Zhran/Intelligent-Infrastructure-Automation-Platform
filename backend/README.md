# ΓÜÖ∩╕Å Backend ΓÇö Intelligent Infrastructure Automation Platform

> Node.js + Express 5 + Prisma ORM + PostgreSQL REST API

---

## ≡ƒôï Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Middleware](#middleware)
- [Email Configuration](#email-configuration)
- [Deployment](#deployment)

---

## ≡ƒîƒ Overview

The backend is a RESTful API built with **Express 5** and **Prisma ORM**. It handles all authentication flows (sign up, sign in, sign out, forgot/reset password, profile management), and is architected using a clean modular MVC pattern.

The API is connected to a **PostgreSQL** database (hosted on Supabase or any PostgreSQL provider) via Prisma, with an `app` schema and Row-Level Security support.

---

## ≡ƒ¢á∩╕Å Tech Stack

| Technology | Version | Role |
|---|---|---|
| **Node.js** | 18+ | JavaScript runtime |
| **Express** | 5.3.x | HTTP web framework |
| **Prisma ORM** | 7.10.x | Type-safe database ORM |
| **PostgreSQL** | 14+ | Relational database |
| **@prisma/adapter-pg** | 7.10.x | Prisma PostgreSQL driver adapter |
| **pg** | 8.23.x | PostgreSQL Node client |
| **JWT (jsonwebtoken)** | 9.0.x | Stateless authentication tokens |
| **bcrypt** | 6.0.x | Secure password hashing |
| **Joi** | 18.2.x | Schema-based request validation |
| **Nodemailer** | 10.1.x | SMTP email sending |
| **Resend** | 6.33.x | Transactional email (alternative) |
| **cookie-parser** | 1.4.x | HTTP cookie parsing |
| **cors** | 2.8.x | Cross-Origin Resource Sharing |
| **dotenv** | 18.x | Environment variable loading |
| **nodemon** | 3.1.x | Dev auto-restart watcher |

---

## ≡ƒôü Project Structure

```
backend/
Γö£ΓöÇΓöÇ ≡ƒôä server.js              # Entry point ΓÇö starts HTTP server
Γö£ΓöÇΓöÇ ≡ƒôä package.json           # Dependencies & npm scripts
Γö£ΓöÇΓöÇ ≡ƒôä prisma.config.js       # Prisma configuration
Γö£ΓöÇΓöÇ ≡ƒôä .env.example           # Environment variable template
Γö£ΓöÇΓöÇ ≡ƒôä .gitignore
Γöé
Γö£ΓöÇΓöÇ ≡ƒôé prisma/
Γöé   Γö£ΓöÇΓöÇ ≡ƒôä schema.prisma      # Complete database schema (all models)
Γöé   ΓööΓöÇΓöÇ ≡ƒôé migrations/        # Prisma migration history
Γöé
Γö£ΓöÇΓöÇ ≡ƒôé generated/
Γöé   ΓööΓöÇΓöÇ ≡ƒôé prisma/            # Auto-generated Prisma Client (gitignored)
Γöé
ΓööΓöÇΓöÇ ≡ƒôé src/
    Γö£ΓöÇΓöÇ ≡ƒôä app.js             # Express app: middleware, routes, error handlers
    Γö£ΓöÇΓöÇ ≡ƒôä server.js          # HTTP server bootstrap
    Γöé
    Γö£ΓöÇΓöÇ ≡ƒôé config/
    Γöé   ΓööΓöÇΓöÇ ≡ƒôä cors.js        # CORS origin whitelist configuration
    Γöé
    Γö£ΓöÇΓöÇ ≡ƒôé db/
    Γöé   ΓööΓöÇΓöÇ ≡ƒôä prisma.js      # Prisma client singleton instance
    Γöé
    Γö£ΓöÇΓöÇ ≡ƒôé middleware/
    Γöé   Γö£ΓöÇΓöÇ ≡ƒôä authenticate.js    # JWT verification middleware
    Γöé   Γö£ΓöÇΓöÇ ≡ƒôä validateRequest.js # Joi schema validation middleware
    Γöé   Γö£ΓöÇΓöÇ ≡ƒôä notFound.js        # 404 handler
    Γöé   ΓööΓöÇΓöÇ ≡ƒôä globalError.js     # Global error handler
    Γöé
    Γö£ΓöÇΓöÇ ≡ƒôé modules/
    Γöé   ΓööΓöÇΓöÇ ≡ƒôé auth/
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä auth.routes.js          # Express router
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä auth.controller.js      # Request handlers
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä auth.service.js         # Business logic
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä auth.repository.js      # Database queries
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä auth.validation.js      # Joi validation schemas
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä password.service.js     # Password hashing helpers
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä password-reset.service.js # Reset token logic
    Γöé       Γö£ΓöÇΓöÇ ≡ƒôä session.service.js      # JWT session management
    Γöé       ΓööΓöÇΓöÇ ≡ƒôä token.service.js        # JWT sign/verify utilities
    Γöé
    ΓööΓöÇΓöÇ ≡ƒôé utils/             # Shared utility functions
```

---

## ≡ƒÅù∩╕Å Architecture

The backend follows a **layered MVC architecture**:

```
Request ΓåÆ Router ΓåÆ Controller ΓåÆ Service ΓåÆ Repository ΓåÆ Database
                       Γåô
                  Middleware
              (Auth / Validation)
```

| Layer | File Pattern | Responsibility |
|---|---|---|
| **Router** | `*.routes.js` | Defines HTTP routes and chains middleware |
| **Controller** | `*.controller.js` | Parses request, calls service, sends response |
| **Service** | `*.service.js` | Business logic, orchestrates repository calls |
| **Repository** | `*.repository.js` | All Prisma/database queries |
| **Validation** | `*.validation.js` | Joi schemas for request bodies |
| **Middleware** | `middleware/` | Auth guard, input validation, error handling |

---

## ≡ƒöî API Reference

**Base URL:** `http://localhost:3000`
**API Prefix:** `/api/v1`

### Health Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | API info & available endpoints |
| `GET` | `/health` | Health check ΓÇö returns `{ "status": "ok" }` |

---

### Auth Endpoints ΓÇö `/api/v1/auth`

#### `POST /api/v1/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" }
  }
}
```

---

#### `POST /api/v1/auth/signin`
Authenticate with email and password. Sets an HTTP-only JWT cookie.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### `POST /api/v1/auth/signout`
Clear the session cookie.

**Response `200`:**
```json
{ "success": true, "message": "Signed out successfully" }
```

---

#### `POST /api/v1/auth/forgot-password`
Send a password reset email to the user.

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response `200`:**
```json
{ "success": true, "message": "Password reset email sent" }
```

---

#### `POST /api/v1/auth/reset-password`
Reset the password using a valid reset token.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Password reset successfully" }
```

---

#### `GET /api/v1/auth/profile` ≡ƒöÆ
Get the authenticated user's profile.

**Headers:** `Authorization: Bearer <token>` or JWT cookie

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2026-10-01T00:00:00.000Z"
    }
  }
}
```

---

#### `PATCH /api/v1/auth/profile` ≡ƒöÆ
Update the authenticated user's profile.

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "newemail@example.com"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { "user": { "..." : "..." } }
}
```

---

#### `PATCH /api/v1/auth/change-password` ≡ƒöÆ
Change the password while authenticated.

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Password changed successfully" }
```

---

### Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": []
}
```

| Status Code | Meaning |
|---|---|
| `400` | Bad Request ΓÇö validation failed |
| `401` | Unauthorized ΓÇö missing or invalid JWT |
| `403` | Forbidden ΓÇö insufficient permissions |
| `404` | Not Found |
| `409` | Conflict ΓÇö e.g., email already registered |
| `500` | Internal Server Error |

---

## ≡ƒùä∩╕Å Database Schema

The database uses a PostgreSQL `app` schema with Row-Level Security. Key models include:

| Model | Description |
|---|---|
| `users` | Core user accounts (id, email, name, hashed password) |
| `projects` | Infrastructure projects |
| `ai_actions` | AI-proposed infrastructure actions |
| `action_approvals` | Approval/rejection decisions for actions |
| `action_policies` | Per-project, per-environment approval policies |
| `deployments` | Deployment records |
| `ai_recommendations` | AI-generated infrastructure recommendations |

> The full schema is defined in [`prisma/schema.prisma`](./prisma/schema.prisma)

---

## ΓÜÖ∩╕Å Installation & Setup

### Prerequisites
- Node.js v18+
- npm v9+
- PostgreSQL v14+ instance (local or hosted)

### Steps

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies (Prisma client is auto-generated via postinstall)
npm install

# 3. Copy and edit the environment file
cp .env.example .env
# Fill in DATABASE_URL, JWT_ACCESS_SECRET, and email config

# 4. Generate Prisma client
npx prisma generate

# 5. Apply migrations to your database
npx prisma migrate deploy

# 6. Start the development server
npm run dev
```

> API available at **http://localhost:3000**

---

## ≡ƒöæ Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@host:5432/postgres?schema=app"

# JWT Authentication
JWT_ACCESS_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_ACCESS_EXPIRES_IN=15m

# Password Reset
PASSWORD_RESET_TOKEN_TTL_MINUTES=15

# Email ΓÇö SMTP (Gmail recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM="Intelligent Platform <your_email@gmail.com>"

# Email ΓÇö Resend (optional alternative)
# RESEND_API_KEY=re_your_api_key_here
# RESEND_FROM=onboarding@resend.dev
```

> **Security:** Never commit your `.env` file. It is already in `.gitignore`.

---

## ≡ƒô£ Available Scripts

Run these from the `backend/` directory:

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (auto-restarts on changes) |
| `npm start` | Start server in production mode |
| `npm run build` | Run `npx prisma generate` (for CI/CD) |

### Prisma Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Apply migrations to the database
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name your_migration_name
```

---

## ≡ƒ¢í∩╕Å Middleware

| Middleware | File | Description |
|---|---|---|
| `authenticate` | `middleware/authenticate.js` | Verifies JWT from cookie or `Authorization` header. Attaches `req.user` to the request. |
| `validateRequest` | `middleware/validateRequest.js` | Takes a Joi schema, validates `req.body`, and returns `400` on failure. |
| `notFound` | `middleware/notFound.js` | Catches unmatched routes and returns `404`. |
| `globalError` | `middleware/globalError.js` | Centralized error handler ΓÇö catches all thrown errors and formats the response. |

---

## ≡ƒôº Email Configuration

The platform supports two email providers:

### Option A ΓÇö Gmail SMTP (Recommended for development)

1. Enable **2-Step Verification** on your Google account
2. Go to **Google Account ΓåÆ Security ΓåÆ App Passwords**
3. Generate a new app password for "Mail"
4. Use the 16-character password as `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="Intelligent Platform <you@gmail.com>"
```

### Option B ΓÇö Resend (Recommended for production)

1. Create an account at [resend.com](https://resend.com)
2. Generate an API key
3. Set environment variables:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=onboarding@resend.dev
```

---

## ≡ƒÜÇ Deployment

### Railway (Recommended)

1. Create a new project at [Railway](https://railway.app)
2. Add a **PostgreSQL** plugin/service
3. Connect your GitHub repository
4. Set **Root Directory** to `backend`
5. Set **Start Command** to `npm start`
6. Add all environment variables from `.env.example`
7. Railway runs `npm install` ΓåÆ `postinstall` auto-generates Prisma client

### Render

1. Create a new **Web Service** at [Render](https://render.com)
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. **Build Command:** `npm install && npx prisma generate`
5. **Start Command:** `npm start`
6. Add environment variables in Render's dashboard

---

> For full project documentation, see the [main repository README](https://github.com/Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform#readme).
