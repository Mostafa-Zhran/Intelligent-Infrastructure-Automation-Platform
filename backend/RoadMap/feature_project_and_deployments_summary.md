# Feature Branch Analysis: `feature/project_and_deployments`

This document details the contents, architecture, and differences extracted from the remote branch `feature/project_and_deployments` into the `backend/feature_project_and_deployments/` folder.

---

## 1. Directory Structure

```
backend/feature_project_and_deployments/
├── .env.example                                      # Environment variables including Jenkins config
├── server.js                                         # Root forwarder
├── prisma/
│   ├── schema.prisma                                 # Database schema with active deployment index
│   └── migrations/
│       ├── 20261015010000_add_password_reset_tokens/
│       ├── 20261024000000_add_github_integration_and_project_setup/
│       └── 20261103010000_add_active_deployment_unique_index/  # Prevents duplicate active deployments
├── src/
│   ├── app.js                                        # Express application mounting auth, github, projects
│   ├── server.js                                     # HTTP server entrypoint
│   ├── config/
│   │   ├── cors.js                                   # CORS options
│   │   └── swagger.js                                # OpenAPI/Swagger docs covering Projects & Deployments
│   ├── db/
│   │   └── prisma.js                                 # Prisma client singleton
│   ├── middleware/
│   │   ├── authenticate.js                           # JWT bearer / cookie authentication
│   │   ├── authorize.js                              # Role-based authorization
│   │   ├── correlationId.js                          # Request correlation ID tracking (X-Correlation-ID)
│   │   ├── globalError.js                            # Centralized error handler
│   │   ├── notFound.js                               # 404 handler
│   │   └── validateRequest.js                        # Joi schema validation
│   ├── modules/
│   │   ├── auth/                                     # Authentication & password reset module
│   │   ├── integrations/
│   │   │   ├── github/                               # GitHub OAuth, orgs, repos, and branches
│   │   │   └── jenkins/                              # Jenkins CI/CD trigger service & config
│   │   │       ├── jenkins.config.js                 # Jenkins URL, user, API token, job name
│   │   │       └── jenkins.service.js                # CSRF crumb issuer, build trigger, queue tracking
│   │   └── projects/                                 # Projects and Deployment Requests (Point 5)
│   │       ├── projects.controller.js                # Overview, deployment history, submit request
│   │       ├── projects.repository.js                # Prisma queries for projects, roles & deployments
│   │       ├── projects.routes.js                    # Express router with Swagger OpenAPI specs
│   │       ├── projects.service.js                   # Project access control & deployment submission logic
│   │       └── projects.validation.js                # Joi validation schemas for inputs & headers
│   └── utils/
│       ├── ApiError.js
│       ├── asyncHandler.js
│       └── email.service.js
└── tests/
    ├── integration/
    │   └── projects.api.test.js                      # Full HTTP integration tests for Projects API
    └── unit/
        └── projects.service.test.js                  # Unit tests for project access & deployment submission
```

---

## 2. Key Modules & Implementations

### A. Projects & Deployment Requests Module (`src/modules/projects/`)
Implements **DETAILS-01**, **DETAILS-02**, and **DETAILS-03** from the MVP checklist:
1. **`GET /api/projects/:projectId`**:
   - Returns project overview: Git repository metadata, selected branch, default environment, setup status (`PENDING`, `READY`, etc.).
   - Includes latest deployment status and safe infrastructure resource details.
   - Credentials, private keys, and environment secrets are excluded.
   - Enforces role/membership checks: Accessible by project owner, platform admin, or active project members.
2. **`GET /api/projects/:projectId/deployments`**:
   - Returns paginated deployment history for the project.
   - Supports filtering by `environment` and `status` (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`).
   - Sorted newest first.
3. **`POST /api/projects/:projectId/deployments`**:
   - Submits a new deployment request with `QUEUED` status.
   - **Idempotency Protection**: Checks `Idempotency-Key` header or body parameter. If re-submitted with the same key, it returns the existing deployment idempotently.
   - **Single Active Deployment Enforcement**: Prevents creating a second deployment if an active deployment (`QUEUED` or `RUNNING`) already exists for that project and environment.
   - **Jenkins CI/CD Trigger**: Calls `jenkins.service.js` to trigger the remote build job asynchronously, recording the external build URL and queue ID.

### B. Jenkins Integration Module (`src/modules/integrations/jenkins/`)
- **`jenkins.config.js`**:
  - `JENKINS_URL`, `JENKINS_USER`, `JENKINS_API_TOKEN`, `JENKINS_JOB_NAME`.
- **`jenkins.service.js`**:
  - `triggerDeploymentBuild({ deploymentId, projectId, repositoryUrl, branch, environment, correlationId })`
  - Handles Jenkins crumb (CSRF protection) retrieval and submits parameterized build requests.

### C. Request Tracking Middleware (`src/middleware/correlationId.js`)
- Inspects incoming `X-Correlation-ID` or generates a unique UUID.
- Attaches `req.correlationId` to the request and forwards it in response headers.

### D. Automated Tests (`tests/`)
- **Unit Tests (`tests/unit/projects.service.test.js`)**: 797 lines covering permissions, idempotency checks, and deployment triggers with mock repositories.
- **Integration Tests (`tests/integration/projects.api.test.js`)**: 593 lines testing full HTTP routes, parameters, authorization errors, and responses.

---

## 3. Difference Compared to Current Active Backend

| Feature | Current Backend | `feature/project_and_deployments` |
|---|---|---|
| **Projects Module** | Not present | Fully implemented (`src/modules/projects/`) |
| **Jenkins Service** | Not present | Fully implemented (`src/modules/integrations/jenkins/`) |
| **Correlation ID** | Not present | Added in `src/middleware/correlationId.js` |
| **Active Deployment Index** | In schema | Dedicated migration (`20261103010000`) |
| **Automated Tests** | Basic | Comprehensive unit and integration test suites |
| **GitHub Integration** | Full | Full (identical core logic) |
| **Auth Module** | Full | Full |

---

## 4. How to Integrate into Main/Backend

When ready to merge these capabilities into your active backend:
1. Copy `src/modules/projects/` into `backend/src/modules/projects/`.
2. Copy `src/modules/integrations/jenkins/` into `backend/src/modules/integrations/jenkins/`.
3. Copy `src/middleware/correlationId.js` into `backend/src/middleware/correlationId.js`.
4. Register `projectsRoutes` in `backend/src/app.js`:
   ```javascript
   const projectsRoutes = require('./modules/projects/projects.routes');
   app.use('/api/projects', projectsRoutes);
   ```
5. Copy unit and integration tests into `backend/tests/`.

