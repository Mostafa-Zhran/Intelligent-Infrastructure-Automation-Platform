# Backend MVP Checklist

> This checklist contains only the Backend work required for the agreed MVP scope:
> 1. Web dashboard for submitting deployment requests.
> 2. Git repository input for user applications.
> 3. Terraform-based AWS infrastructure provisioning.
> 4. Ansible-based server configuration.
> 5. Jenkins pipeline to build Docker images and deploy to Kubernetes.
> 6. Deployment status tracking and logs display.
>
> Direct Terraform, Ansible, Jenkins, Docker, AWS, and Kubernetes execution is handled by the DevOps implementation. This document covers the Backend APIs, data, authorization, and integration contracts needed to support that execution.

## 1. Project-wide Backend Foundation

### FND-01 — Define MVP API conventions
- [x] Define the `/api` route convention and stable endpoint names.
- [x] Define a consistent success response format.
- [x] Define a consistent error response format.
- [x] Document expected HTTP status codes.
- [x] Publish the MVP API contract in Swagger / OpenAPI.

### FND-02 — Authentication and authorization
- [x] Require authentication for Dashboard, project, GitHub, and deployment endpoints.
- [x] Enforce project-level authorization.
- [x] Ensure a user can access only projects and deployments they are permitted to view or manage.
- [ ] Enforce deployment permission before a user submits a deployment request.
- [x] Add tests for unauthenticated and forbidden requests.

### FND-03 — MVP database and persistence
- [x] Create core entities: Project, GitHubConnection, ProjectEnvironment, Deployment, Pipeline, PipelineStage, and DeploymentLog.
- [x] Store project ownership or project-access information.
- [x] Store repository URL, selected branch, target environment, and project status.
- [x] Store deployment status, commit reference, timestamps, and safe failure summary.
- [x] Create database migrations.
- [x] Add required database constraints and indexes for project and deployment lookup.

### FND-04 — Validation, errors, and secure logging
- [x] Create request and response DTOs for MVP endpoints.
- [x] Validate required fields and allowed status/environment values.
- [x] Add centralized exception handling.
- [x] Return clear validation errors without exposing internal infrastructure details.
- [x] Add structured application logging with a request or correlation ID.

### FND-05 — Application security baseline
- [x] Store GitHub OAuth tokens securely and never return them in API responses.
- [x] Never return deployment secrets, credentials, or private keys in API responses.
- [x] Redact credentials and secret values from logs.
- [x] Record audit events for project creation and deployment requests.

## 2. Dashboard

### DASH-01 — Dashboard summary
**Proposed API:** `GET /api/dashboard`
- [x] Return projects visible to the current user.
- [x] Return a simple project count.
- [x] Return the latest deployment summary for each displayed project where available.
- [x] Include project name, repository name, environment, and latest deployment status.
- [x] Test empty Dashboard data and user-level authorization.

### DASH-02 — Recent deployments
**Proposed API:** `GET /api/dashboard/recent-deployments?limit=10`
- [x] Return the most recent deployments visible to the current user.
- [x] Sort by creation time, newest first.
- [x] Include deployment ID, project ID/name, environment, status, and timestamps.
- [x] Include a safe error summary when a deployment fails.
- [x] Cap the requested limit.

## 3. Projects and Git Repositories

### PROJ-01 — List projects
**Proposed API:** `GET /api/projects`
- [x] Return projects visible to the current user.
- [x] Include project ID, name, repository URL, selected branch, environment, and current status.
- [x] Return the latest deployment status when available.
- [x] Define a default sort order.
- [x] Test empty project lists.

### PROJ-02 — Get project details
**Proposed API:** `GET /api/projects/{projectId}`
- [x] Validate the project ID and confirm that the project exists.
- [x] Check that the current user has access to the project.
- [x] Return project name, repository, selected branch, environment, and setup status.
- [x] Return the latest deployment summary.
- [x] Do not return secret values or internal credentials.
- [x] Test not-found and forbidden responses.

### PROJ-03 — Create project record
**Proposed API:** `POST /api/projects`
- [x] Define the create-project request DTO.
- [x] Require a project name, authorized repository, selected branch, and development environment.
- [x] Confirm that the connected GitHub account can access the selected repository.
- [x] Persist the project and ownership/access information.
- [x] Create the initial project setup status.
- [x] Prevent duplicate project creation for the same repository and environment.
- [x] Return the new project ID and initial status.
- [ ] Test invalid input, duplicate creation, and unauthorized repository access.

## 4. GitHub Integration

### GH-01 — Start GitHub OAuth connection
**Proposed API:** `GET /api/integrations/github/connect`
- [x] Verify that the user is authenticated.
- [x] Generate a cryptographically random OAuth `state` value.
- [x] Bind the state to the user/session with an expiry.
- [x] Generate the GitHub authorization URL using minimum required scopes.
- [x] Redirect or return the authorization URL for the frontend flow.

### GH-02 — Handle GitHub OAuth callback
**Proposed API:** `GET /api/integrations/github/callback`
- [x] Validate the OAuth state and expiry.
- [x] Handle user cancellation and GitHub provider errors.
- [x] Exchange the authorization code server-side.
- [x] Retrieve the GitHub account identity.
- [x] Store the token securely.
- [x] Associate the connection with the authenticated platform user.
- [x] Prevent token and authorization-code leakage in logs or URLs.

### GH-03 — Check GitHub connection status
**Proposed API:** `GET /api/integrations/github/status`
- [x] Return whether the current user has a GitHub connection.
- [x] Return safe account metadata such as the GitHub login.
- [x] Do not return the access token.
- [x] Handle revoked or expired credentials.

### GH-04 — List accessible accounts and organizations
**Proposed API:** `GET /api/integrations/github/organizations`
- [x] Return the connected personal account.
- [x] Return organizations available to the connected user.
- [x] Return IDs, logins, and display names needed by the UI.
- [x] Surface permission limitations when an expected organization is unavailable.

### GH-05 — List accessible repositories
**Proposed API:** `GET /api/integrations/github/repositories?owner={owner}`
- [x] Validate that the requested owner is available to the connected user.
- [x] Fetch repositories accessible to the connected account.
- [x] Return repository ID, name, full name, URL, visibility, and default branch.
- [x] Respect private-repository permissions.
- [x] Handle revoked tokens and provider errors.

### GH-06 — List repository branches
**Proposed API:** `GET /api/integrations/github/repositories/{owner}/{repo}/branches`
- [x] Validate repository access.
- [x] Return available branch names.
- [x] Identify the default branch.
- [x] Handle deleted or inaccessible repositories.

## 5. Project Details and Deployment Requests

### DETAILS-01 — Project overview
**Proposed API:** `GET /api/projects/{projectId}`
- [x] Return repository, selected branch, environment, and setup status.
- [x] Return latest deployment status and timestamps.
- [x] Return safe deployment target information without credentials.
- [x] Enforce project access.

### DETAILS-02 — Project deployment history
**Proposed API:** `GET /api/projects/{projectId}/deployments`
- [x] Return deployments belonging to the project.
- [x] Sort deployments newest first.
- [x] Include deployment ID, environment, branch/commit, status, and timestamps.
- [x] Enforce project access.

### DETAILS-03 — Submit a deployment request
**Proposed API:** `POST /api/projects/{projectId}/deployments`
- [x] Verify project access and deployment permission.
- [x] Validate the target environment and project configuration.
- [x] Resolve the selected branch or commit.
- [x] Create a deployment record with the `Queued` status.
- [x] Snapshot the repository, branch/commit, environment, and permitted configuration needed for execution.
- [x] Publish a deployment job using the agreed queue or Jenkins integration contract.
- [x] Return the deployment ID and queued status.
- [x] Prevent duplicate requests for the same active deployment where required.
- [x] Test invalid configuration, unauthorized access, and queue/integration failures.

## 6. Deployment Tracking and Logs

### DEP-01 — List deployments
**Proposed API:** `GET /api/deployments`
- [x] Return deployments visible to the current user.
- [x] Include deployment ID, project name/ID, environment, status, and timestamps.
- [x] Sort newest first.
- [x] Test empty results and authorization.

### DEP-02 — Deployment details
**Proposed API:** `GET /api/deployments/{deploymentId}`
- [x] Validate the deployment ID and confirm that the record exists.
- [x] Enforce access through the associated project.
- [x] Return branch, commit SHA, environment, status, timestamps, and current pipeline stage.
- [x] Return a safe failure summary when the deployment fails.
- [x] Return the deployment URL if it is available.
- [x] Never return credentials or secret values.

### DEP-03 — Deployment logs
**Proposed API:** `GET /api/deployments/{deploymentId}/logs`
- [x] Return logs for an authorized deployment.
- [x] Support retrieval by deployment and pipeline stage.
- [x] Redact tokens, passwords, private keys, and environment secrets.
- [x] Limit response size to protect the API and UI.
- [x] Return a clear response when logs are not yet available.
- [x] Test secret redaction and unauthorized access.

### DEP-04 — Deployment state updates
**Integration endpoint or queue consumer:** `POST /api/deployments/{deploymentId}/status`
- [x] Accept status updates only from the authorized Jenkins/worker integration.
- [x] Support the MVP states: `Queued`, `Running`, `Succeeded`, and `Failed`.
- [x] Record state-change timestamps and pipeline stage updates.
- [x] Reject invalid state transitions.
- [x] Prevent stale or duplicate worker updates from overwriting a newer state.
- [x] Persist safe failure details and log references when supplied by the worker.
- [x] Test valid, invalid, duplicate, and out-of-order status updates.

## 7. Backend Testing and API Delivery

### TEST-01 — Unit tests
- [ ] Test project creation and deployment-request validation.
- [x] Test GitHub integration behavior using mocked provider responses.
- [x] Test project-level authorization.
- [ ] Test deployment state transitions.
- [ ] Test log redaction.

### TEST-02 — Backend integration tests
- [x] Test API and database operations against a clean database.
- [x] Test database migrations.
- [x] Test GitHub OAuth and repository API contracts with safe test doubles.
- [x] Test deployment-job publishing and worker status-update contracts.
- [ ] Test deployment-log persistence and retrieval.

### TEST-03 — API documentation
- [x] Document request and response DTOs.
- [x] Document authentication and authorization requirements.
- [x] Document validation errors and status codes.
- [x] Add example requests and responses without real secrets.
- [x] Verify that Swagger / OpenAPI matches the implementation.

### TEST-04 — Definition of Done for every MVP Backend task
- [x] Implementation is complete.
- [x] Validation and authorization are implemented.
- [x] Error handling is consistent.
- [x] Tests pass.
- [x] Swagger / API contract is updated.
- [x] Logs and API responses do not expose secrets.
- [ ] Code is reviewed and merged.
- [ ] Acceptance criteria have been verified.

## Suggested MVP Backend Implementation Order

1. [x] Define entities, deployment status enum, DTOs, and API conventions.
2. [x] Implement authentication, project authorization, migrations, validation, and shared error handling.
3. [x] Implement GitHub OAuth plus repository and branch listing.
4. [x] Implement project creation and project-details APIs.
5. [x] Define and implement the Backend-to-Jenkins/worker deployment contract.
6. [x] Implement deployment request, state updates, history, details, and logs APIs.
7. [x] Connect Dashboard APIs to persisted project and deployment data.
8. [ ] Complete security, integration, and API documentation tests.
