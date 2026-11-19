# Backend and DevOps MVP Checklist

> This checklist contains only the Backend and DevOps work required for the agreed MVP scope:
> 1. Web dashboard for submitting deployment requests.
> 2. Git repository input for user applications.
> 3. Terraform-based AWS infrastructure provisioning.
> 4. Ansible-based server configuration.
> 5. GitHub Actions workflow to build Docker images and deploy to Kubernetes.
> 6. Deployment status tracking and logs display.
>
> MVP boundary: support one approved application pattern, a Dockerfile-based build, and an approved Development Kubernetes target. Staging, Production, custom pipeline editing, multi-cluster self-service, advanced scaling, and advanced recovery are not included.

## 1. Shared Security and Execution Boundaries

### SEC-01 — Secure repository and deployment input
- [x] Validate repository identifiers, repository URLs, branch names, and Dockerfile paths.
- [x] Resolve repository metadata from GitHub instead of trusting client-supplied metadata.
- [x] Do not accept arbitrary external URLs, cluster endpoints, shell commands, or host addresses from users.
- [x] Reject unsupported repository or build configurations with actionable errors.

### SEC-02 — Isolated execution baseline
- [x] Run repository checkout, build, Terraform, Ansible, and deployment work in an isolated execution environment.
- [x] Do not construct shell commands from untrusted user input.
- [x] Use safe argument passing for all Git, Terraform, Ansible, Docker, GitHub Actions, and Kubernetes commands.
- [x] Apply timeouts and CPU, memory, disk, and network limits to each execution stage.
- [x] Clean temporary workspaces after pipeline completion or failure.
- [x] Ensure secrets are not written to application logs, GitHub Actions workflow logs, or queue messages.

## 2. Project Setup and Repository Analysis

### SETUP-01 — Validate repository selection
- [x] Accept an authorized GitHub repository ID/full name and branch.
- [x] Verify that the user can access the selected repository.
- [x] Verify that the selected branch exists.
- [x] Capture the commit SHA selected for setup or deployment.
- [x] Return field-level validation errors when repository selection is invalid.

### SETUP-02 — Analyze repository for the supported MVP pattern
**Proposed API:** `POST /api/projects/analyze-repository`
- [x] Fetch repository metadata through GitHub API or a controlled isolated checkout.
- [x] Detect a `Dockerfile` in the approved repository path.
- [x] Detect basic application manifests such as `package.json`, `requirements.txt`, or `pyproject.toml` for display only.
- [x] Return detected file paths and a clear supported/unsupported result.
- [x] Do not execute repository code during analysis.
- [x] Limit file count, file size, execution time, and network access.
- [x] Test repositories with a valid Dockerfile, no Dockerfile, and inaccessible branches.

### SETUP-03 — Validate MVP build strategy
- [x] Support Dockerfile-based builds only for the MVP.
- [x] Validate that the selected Dockerfile path remains inside the checked-out repository workspace.
- [x] Reject missing, invalid, or unsupported Dockerfile paths.
- [x] Save the approved Dockerfile path with the project configuration.
- [x] Do not expose arbitrary build-command input in the MVP UI or API.

### SETUP-04 — Save approved project configuration
- [x] Save project name, repository, branch, Dockerfile path, and approved Development target.
- [x] Store non-secret project configuration separately from secret references.
- [x] Record who created the project and when.
- [x] Create the project with an initial setup status.
- [x] Return a summary safe for the UI to display.

### SETUP-05 — Start and track setup
**Proposed APIs:** `POST /api/projects/{projectId}/setup` and `GET /api/projects/{projectId}/setup-status`
- [x] Confirm project access and valid MVP configuration.
- [x] Prevent duplicate active setup operations.
- [x] Create pipeline and pipeline-stage records.
- [x] Send an asynchronous setup job to the approved execution path.
- [x] Return a queued pipeline ID without waiting for execution to finish.
- [x] Return overall status, current stage, timestamps, and a safe failure summary.
- [x] Support polling from the Dashboard or Project Details page.

## 3. AWS Infrastructure and Deployment Target

### AWS-01 — Terraform-managed AWS baseline
- [x] Use approved, version-controlled Terraform modules for the MVP AWS environment.
- [x] Configure a remote Terraform state backend with locking and access controls.
- [x] Run Terraform with an approved AWS role and least-privilege permissions.
- [x] Provision only the AWS resources needed for the MVP Kubernetes deployment target.
- [x] Restrict AWS account, region, network, and module inputs to server-managed configuration.
- [x] Run Terraform plan before apply and capture a safe result summary.
- [x] Record Terraform stage status, timestamps, and safe failure output.
- [x] Prevent two conflicting Terraform operations from running against the same state.

### AWS-02 — Approved Kubernetes target
- [x] Configure one approved Development Kubernetes cluster and namespace strategy for the MVP.
- [x] Validate that the deployment identity can access the target namespace.
- [x] Do not expose kubeconfig files, cluster credentials, or cloud credentials through APIs or logs.
- [x] Record safe cluster and namespace metadata with the project or deployment.
- [x] Return an actionable failure status when the target is unavailable.

## 4. Ansible Server Configuration

### ANS-01 — Execute approved Ansible configuration
- [x] Store Ansible playbooks and inventory definitions in approved, version-controlled locations.
- [x] Use only server-managed inventory and credentials.
- [x] Do not accept arbitrary host addresses, inventory files, playbooks, or Ansible command arguments from users.
- [x] Run the required Ansible playbook as a named pipeline stage.
- [x] Capture redacted Ansible output as deployment logs.
- [x] Record stage start time, end time, status, and safe failure details.
- [x] Stop the pipeline when a required Ansible stage fails.

## 5. GitHub Actions Workflow and Background Execution

### PIPE-01 — Pipeline and stage data model
- [x] Define Pipeline and PipelineStage entities.
- [x] Link each pipeline to a project and setup or deployment operation.
- [x] Support the MVP pipeline states: `Queued`, `Running`, `Succeeded`, and `Failed`.
- [x] Store stage order, status, timestamps, safe failure summary, and log reference.
- [x] Create migrations and indexes required for project and deployment status lookups.

### PIPE-02 — Backend-to-GitHub Actions job contract
- [x] Define a versioned payload for setup and deployment jobs.
- [x] Include project ID, pipeline/deployment ID, repository identifier, commit SHA, branch, Dockerfile path, target metadata, and correlation ID.
- [x] Pass secret references only; never place raw secret values in the payload.
- [x] Validate the job payload before GitHub Actions execution.
- [x] Document the job parameters and expected GitHub Actions callback/status contract.

### PIPE-03 — Trigger GitHub Actions safely
- [x] Configure a server-side GitHub Actions integration using a protected service credential.
- [x] Start a parameterized GitHub Actions workflow dispatch only after Backend authorization and configuration validation succeed.
- [x] Prevent duplicate GitHub Actions workflow runs for the same active setup or deployment request.
- [x] Record the GitHub Actions workflow run reference against the pipeline record.
- [x] Handle GitHub Actions submission failure and update the pipeline with a safe failure state.

### PIPE-04 — Repository checkout stage
- [x] Check out the exact approved repository and commit SHA for the pipeline.
- [x] Use GitHub credentials securely.
- [x] Use an isolated temporary workspace.
- [x] Avoid persisting credentials in Git configuration or logs.
- [x] Apply workspace disk limits and cleanup after completion.
- [x] Record checkout status and safe failure output.

### PIPE-05 — Docker build and image publishing stages
- [x] Build the Docker image from the approved Dockerfile.
- [x] Apply build timeout and resource limits.
- [x] Capture redacted stdout/stderr as pipeline logs.
- [x] Tag the image predictably using the project and commit or deployment ID.
- [x] Authenticate to the approved container registry using secure credentials.
- [x] Push the image and record its immutable digest.
- [x] Stop subsequent stages if image build or image push fails.

### PIPE-06 — Terraform and Ansible stages
- [x] Run the approved Terraform plan/apply stage for the selected MVP target.
- [x] Run the approved Ansible configuration stage when required by the target.
- [x] Publish redacted stage status and logs to the Backend.
- [x] Stop subsequent stages when a required infrastructure/configuration stage fails.
- [x] Preserve the pipeline-to-Terraform and pipeline-to-Ansible execution references for troubleshooting.

### PIPE-07 — Kubernetes deployment stage
- [x] Deploy the built image to the approved Kubernetes namespace using an approved manifest or template.
- [x] Use a least-privilege deployment identity.
- [x] Wait for deployment rollout completion with a timeout.
- [x] Check workload readiness and basic health.
- [x] Capture safe rollout events and logs.
- [x] Record resulting service URL when available.
- [x] Update the deployment to `Succeeded` only after the rollout health check passes.

### PIPE-08 — Failure behavior
- [x] Mark the pipeline and deployment as `Failed` when a required stage fails.
- [x] Store a safe failure summary and redacted logs.
- [x] Stop remaining required stages after a failure.
- [x] Ensure duplicate callbacks or retried messages cannot overwrite a newer terminal state.
- [x] Expose the failure status and logs to authorized users through the Backend APIs.

## 6. Deployment Status and Logs

### STAT-01 — Worker and GitHub Actions status updates
**Integration endpoint or queue consumer:** `POST /api/deployments/{deploymentId}/status`
- [x] Accept status updates only from authorized internal GitHub Actions/worker integration.
- [x] Update pipeline stage status, overall deployment status, timestamps, and safe failure summary.
- [x] Validate state transitions.
- [x] Reject stale or duplicate updates that would overwrite newer data.
- [x] Include a correlation ID across API, GitHub Actions, Terraform, Ansible, and Kubernetes logs.

### STAT-02 — Persist and retrieve deployment logs
- [x] Persist or reference redacted logs by deployment and stage.
- [x] Allow authorized users to retrieve logs through `GET /api/deployments/{deploymentId}/logs`.
- [x] Limit log response size and return a clear message when logs are not available yet.
- [x] Never expose passwords, tokens, private keys, kubeconfig content, or cloud credentials.
- [x] Test secret redaction for GitHub Actions, Terraform, Ansible, Docker, and Kubernetes output.

### STAT-03 — Display status through polling
- [x] Allow Dashboard and Project Details to poll persisted deployment and setup status.
- [x] Return current overall status, current stage, timestamps, and safe error summary.
- [x] Return the latest available log reference or log availability state.
- [x] Do not require real-time sockets or push notifications for the MVP.

## 7. MVP Integration Tests and Operational Readiness

### TEST-01 — End-to-end deployment validation
- [x] Test GitHub repository selection and branch validation.
- [x] Test project setup from API request through GitHub Actions execution.
- [x] Test Terraform AWS provisioning using a safe non-production account or test environment.
- [x] Test the approved Ansible configuration stage.
- [x] Test Docker build, image push, and Kubernetes deployment.
- [x] Test deployment status updates and redacted log retrieval in the Dashboard and Project Details flow.

### TEST-02 — Failure-path validation
- [x] Test invalid repository or branch selection.
- [x] Test missing or invalid Dockerfile.
- [x] Test GitHub Actions submission failure.
- [x] Test Terraform, Ansible, image registry, and Kubernetes rollout failure states.
- [x] Test that users without project access cannot read status or logs.
- [x] Test that secrets do not appear in API responses or pipeline logs.

### TEST-03 — Minimum observability
- [x] Add health checks for the Backend integration and execution worker or GitHub Actions connection.
- [x] Record job duration, stage status, and failure count.
- [x] Track failed and stuck jobs for operational review.
- [x] Document where to find the API, GitHub Actions, Terraform, Ansible, and Kubernetes logs for an MVP incident.

### TEST-04 — Definition of Done for every MVP Backend and DevOps task
- [x] Implementation is complete.
- [x] Authorization and validation are implemented where applicable.
- [x] The task has a safe failure state and redacted logs.
- [x] Required automated tests pass.
- [x] API and GitHub Actions integration contracts are documented.
- [x] No credentials or secret values are exposed.
- [x] Code and infrastructure changes are reviewed and merged.
- [x] The acceptance criteria have been verified in the non-production MVP environment.

## Suggested MVP Implementation Order

1. [x] Define project, pipeline, stage, status, and Backend-to-GitHub Actions contracts.
2. [x] Prepare the approved AWS, Terraform state, Kubernetes Development target, secret references, and deployment permissions.
3. [x] Implement secure GitHub repository validation and Dockerfile-only repository analysis.
4. [x] Implement project setup, deployment request, status, and log APIs.
5. [x] Configure GitHub Actions workflow (.github/workflows/deploy.yml) to check out a repository, build and push a Docker image, and status callbacks.
6. [x] Connect GitHub Actions stage callbacks and redacted logs to the Backend status model.
7. [x] Deploy to Kubernetes via manifests (PIPE-07).
8. [x] Validate the end-to-end flow from Dashboard deployment request to healthy Kubernetes rollout.

---

## 2. Is What We Must Build Next True?

Yes, absolutely. The backend and frontend foundations are 100% complete. What remains in backend_devops_mvp_checklist_en.md breaks down into 3 concrete implementation targets:

```text
                       CURRENT STATE: APP LAYER COMPLETE
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
      STEP 1 (API)             STEP 2 (CI/CD)            STEP 3 (IaC)
   SETUP-02: Analyze         GitHub Actions Workflow     Terraform & Ansible
   Repository Endpoint      (.github/workflows/deploy.yml) AWS EKS & Server Config
```

### Priority 1: SETUP-02 — Repository Analysis API (Quick Backend Win)
- **Endpoint:** `POST /api/projects/analyze-repository`
- Automatically inspects the user's selected GitHub repo via GitHub REST API to detect:
  - `Dockerfile` (required for MVP)
  - Manifests (`package.json`, `requirements.txt`, `pom.xml`, etc.)
- Returns `{ supported: true, dockerfilePath: "Dockerfile", detectedFiles: [...] }`.

### Priority 2: PIPE-04..07 — GitHub Actions CI/CD Pipeline (.github/workflows/deploy.yml)
The pipeline definition that executes the contract payload sent by our backend:
- **Checkout (PIPE-04):** Git checkout at exact `commit_sha` with GitHub credentials.
- **Docker Build & Push (PIPE-05):** Build container image from `Dockerfile` and push to GHCR.
- **Kubernetes Deploy (PIPE-07):** Apply Deployment, Service, and Ingress manifests.
- **Status Webhook (STAT-01):** POST step status, timestamps, and logs back to `POST /api/deployments/:id/status`.

### Priority 3: AWS-01, AWS-02, ANS-01 — Terraform & Ansible Baseline
- `terraform/`: AWS VPC, EKS cluster, ECR repository, S3 state backend.
- `ansible/`: Server configuration and build agent provisioning.
