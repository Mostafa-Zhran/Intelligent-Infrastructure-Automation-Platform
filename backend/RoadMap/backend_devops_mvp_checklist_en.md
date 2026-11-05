# Backend and DevOps MVP Checklist

> This checklist contains only the Backend and DevOps work required for the agreed MVP scope:
> 1. Web dashboard for submitting deployment requests.
> 2. Git repository input for user applications.
> 3. Terraform-based AWS infrastructure provisioning.
> 4. Ansible-based server configuration.
> 5. Jenkins pipeline to build Docker images and deploy to Kubernetes.
> 6. Deployment status tracking and logs display.
>
> MVP boundary: support one approved application pattern, a Dockerfile-based build, and an approved Development Kubernetes target. Staging, Production, custom pipeline editing, multi-cluster self-service, advanced scaling, and advanced recovery are not included.

## 1. Shared Security and Execution Boundaries

### SEC-01 — Secure repository and deployment input
- [ ] Validate repository identifiers, repository URLs, branch names, and Dockerfile paths.
- [ ] Resolve repository metadata from GitHub instead of trusting client-supplied metadata.
- [ ] Do not accept arbitrary external URLs, cluster endpoints, shell commands, or host addresses from users.
- [ ] Reject unsupported repository or build configurations with actionable errors.

### SEC-02 — Isolated execution baseline
- [ ] Run repository checkout, build, Terraform, Ansible, and deployment work in an isolated execution environment.
- [ ] Do not construct shell commands from untrusted user input.
- [ ] Use safe argument passing for all Git, Terraform, Ansible, Docker, Jenkins, and Kubernetes commands.
- [ ] Apply timeouts and CPU, memory, disk, and network limits to each execution stage.
- [ ] Clean temporary workspaces after pipeline completion or failure.
- [ ] Ensure secrets are not written to application logs, Jenkins console logs, or queue messages.

## 2. Project Setup and Repository Analysis

### SETUP-01 — Validate repository selection
- [ ] Accept an authorized GitHub repository ID/full name and branch.
- [ ] Verify that the user can access the selected repository.
- [ ] Verify that the selected branch exists.
- [ ] Capture the commit SHA selected for setup or deployment.
- [ ] Return field-level validation errors when repository selection is invalid.

### SETUP-02 — Analyze repository for the supported MVP pattern
**Proposed API:** `POST /api/projects/analyze-repository`
- [ ] Fetch repository metadata through GitHub API or a controlled isolated checkout.
- [ ] Detect a `Dockerfile` in the approved repository path.
- [ ] Detect basic application manifests such as `package.json`, `requirements.txt`, or `pyproject.toml` for display only.
- [ ] Return detected file paths and a clear supported/unsupported result.
- [ ] Do not execute repository code during analysis.
- [ ] Limit file count, file size, execution time, and network access.
- [ ] Test repositories with a valid Dockerfile, no Dockerfile, and inaccessible branches.

### SETUP-03 — Validate MVP build strategy
- [ ] Support Dockerfile-based builds only for the MVP.
- [ ] Validate that the selected Dockerfile path remains inside the checked-out repository workspace.
- [ ] Reject missing, invalid, or unsupported Dockerfile paths.
- [ ] Save the approved Dockerfile path with the project configuration.
- [ ] Do not expose arbitrary build-command input in the MVP UI or API.

### SETUP-04 — Save approved project configuration
- [ ] Save project name, repository, branch, Dockerfile path, and approved Development target.
- [ ] Store non-secret project configuration separately from secret references.
- [ ] Record who created the project and when.
- [ ] Create the project with an initial setup status.
- [ ] Return a summary safe for the UI to display.

### SETUP-05 — Start and track setup
**Proposed APIs:** `POST /api/projects/{projectId}/setup` and `GET /api/projects/{projectId}/setup-status`
- [ ] Confirm project access and valid MVP configuration.
- [ ] Prevent duplicate active setup operations.
- [ ] Create pipeline and pipeline-stage records.
- [ ] Send an asynchronous setup job to the approved execution path.
- [ ] Return a queued pipeline ID without waiting for execution to finish.
- [ ] Return overall status, current stage, timestamps, and a safe failure summary.
- [ ] Support polling from the Dashboard or Project Details page.

## 3. AWS Infrastructure and Deployment Target

### AWS-01 — Terraform-managed AWS baseline
- [ ] Use approved, version-controlled Terraform modules for the MVP AWS environment.
- [ ] Configure a remote Terraform state backend with locking and access controls.
- [ ] Run Terraform with an approved AWS role and least-privilege permissions.
- [ ] Provision only the AWS resources needed for the MVP Kubernetes deployment target.
- [ ] Restrict AWS account, region, network, and module inputs to server-managed configuration.
- [ ] Run Terraform plan before apply and capture a safe result summary.
- [ ] Record Terraform stage status, timestamps, and safe failure output.
- [ ] Prevent two conflicting Terraform operations from running against the same state.

### AWS-02 — Approved Kubernetes target
- [ ] Configure one approved Development Kubernetes cluster and namespace strategy for the MVP.
- [ ] Validate that the deployment identity can access the target namespace.
- [ ] Do not expose kubeconfig files, cluster credentials, or cloud credentials through APIs or logs.
- [ ] Record safe cluster and namespace metadata with the project or deployment.
- [ ] Return an actionable failure status when the target is unavailable.

## 4. Ansible Server Configuration

### ANS-01 — Execute approved Ansible configuration
- [ ] Store Ansible playbooks and inventory definitions in approved, version-controlled locations.
- [ ] Use only server-managed inventory and credentials.
- [ ] Do not accept arbitrary host addresses, inventory files, playbooks, or Ansible command arguments from users.
- [ ] Run the required Ansible playbook as a named pipeline stage.
- [ ] Capture redacted Ansible output as deployment logs.
- [ ] Record stage start time, end time, status, and safe failure details.
- [ ] Stop the pipeline when a required Ansible stage fails.

## 5. Jenkins Pipeline and Background Execution

### PIPE-01 — Pipeline and stage data model
- [ ] Define Pipeline and PipelineStage entities.
- [ ] Link each pipeline to a project and setup or deployment operation.
- [ ] Support the MVP pipeline states: `Queued`, `Running`, `Succeeded`, and `Failed`.
- [ ] Store stage order, status, timestamps, safe failure summary, and log reference.
- [ ] Create migrations and indexes required for project and deployment status lookups.

### PIPE-02 — Backend-to-Jenkins job contract
- [ ] Define a versioned payload for setup and deployment jobs.
- [ ] Include project ID, pipeline/deployment ID, repository identifier, commit SHA, branch, Dockerfile path, target metadata, and correlation ID.
- [ ] Pass secret references only; never place raw secret values in the payload.
- [ ] Validate the job payload before Jenkins execution.
- [ ] Document the job parameters and expected Jenkins callback/status contract.

### PIPE-03 — Trigger Jenkins safely
- [ ] Configure a server-side Jenkins integration using a protected service credential.
- [ ] Start a parameterized Jenkins job only after Backend authorization and configuration validation succeed.
- [ ] Prevent duplicate Jenkins jobs for the same active setup or deployment request.
- [ ] Record the Jenkins build reference against the pipeline record.
- [ ] Handle Jenkins submission failure and update the pipeline with a safe failure state.

### PIPE-04 — Repository checkout stage
- [ ] Check out the exact approved repository and commit SHA for the pipeline.
- [ ] Use GitHub credentials securely.
- [ ] Use an isolated temporary workspace.
- [ ] Avoid persisting credentials in Git configuration or logs.
- [ ] Apply workspace disk limits and cleanup after completion.
- [ ] Record checkout status and safe failure output.

### PIPE-05 — Docker build and image publishing stages
- [ ] Build the Docker image from the approved Dockerfile.
- [ ] Apply build timeout and resource limits.
- [ ] Capture redacted stdout/stderr as pipeline logs.
- [ ] Tag the image predictably using the project and commit or deployment ID.
- [ ] Authenticate to the approved container registry using secure credentials.
- [ ] Push the image and record its immutable digest.
- [ ] Stop subsequent stages if image build or image push fails.

### PIPE-06 — Terraform and Ansible stages
- [ ] Run the approved Terraform plan/apply stage for the selected MVP target.
- [ ] Run the approved Ansible configuration stage when required by the target.
- [ ] Publish redacted stage status and logs to the Backend.
- [ ] Stop subsequent stages when a required infrastructure/configuration stage fails.
- [ ] Preserve the pipeline-to-Terraform and pipeline-to-Ansible execution references for troubleshooting.

### PIPE-07 — Kubernetes deployment stage
- [ ] Deploy the built image to the approved Kubernetes namespace using an approved manifest or template.
- [ ] Use a least-privilege deployment identity.
- [ ] Wait for deployment rollout completion with a timeout.
- [ ] Check workload readiness and basic health.
- [ ] Capture safe rollout events and logs.
- [ ] Record resulting service URL when available.
- [ ] Update the deployment to `Succeeded` only after the rollout health check passes.

### PIPE-08 — Failure behavior
- [ ] Mark the pipeline and deployment as `Failed` when a required stage fails.
- [ ] Store a safe failure summary and redacted logs.
- [ ] Stop remaining required stages after a failure.
- [ ] Ensure duplicate callbacks or retried messages cannot overwrite a newer terminal state.
- [ ] Expose the failure status and logs to authorized users through the Backend APIs.

## 6. Deployment Status and Logs

### STAT-01 — Worker and Jenkins status updates
**Integration endpoint or queue consumer:** `POST /api/deployments/{deploymentId}/status`
- [ ] Accept status updates only from authorized internal Jenkins/worker integration.
- [ ] Update pipeline stage status, overall deployment status, timestamps, and safe failure summary.
- [ ] Validate state transitions.
- [ ] Reject stale or duplicate updates that would overwrite newer data.
- [ ] Include a correlation ID across API, Jenkins, Terraform, Ansible, and Kubernetes logs.

### STAT-02 — Persist and retrieve deployment logs
- [ ] Persist or reference redacted logs by deployment and stage.
- [ ] Allow authorized users to retrieve logs through `GET /api/deployments/{deploymentId}/logs`.
- [ ] Limit log response size and return a clear message when logs are not available yet.
- [ ] Never expose passwords, tokens, private keys, kubeconfig content, or cloud credentials.
- [ ] Test secret redaction for Jenkins, Terraform, Ansible, Docker, and Kubernetes output.

### STAT-03 — Display status through polling
- [ ] Allow Dashboard and Project Details to poll persisted deployment and setup status.
- [ ] Return current overall status, current stage, timestamps, and safe error summary.
- [ ] Return the latest available log reference or log availability state.
- [ ] Do not require real-time sockets or push notifications for the MVP.

## 7. MVP Integration Tests and Operational Readiness

### TEST-01 — End-to-end deployment validation
- [ ] Test GitHub repository selection and branch validation.
- [ ] Test project setup from API request through Jenkins execution.
- [ ] Test Terraform AWS provisioning using a safe non-production account or test environment.
- [ ] Test the approved Ansible configuration stage.
- [ ] Test Docker build, image push, and Kubernetes deployment.
- [ ] Test deployment status updates and redacted log retrieval in the Dashboard and Project Details flow.

### TEST-02 — Failure-path validation
- [ ] Test invalid repository or branch selection.
- [ ] Test missing or invalid Dockerfile.
- [ ] Test Jenkins submission failure.
- [ ] Test Terraform, Ansible, image registry, and Kubernetes rollout failure states.
- [ ] Test that users without project access cannot read status or logs.
- [ ] Test that secrets do not appear in API responses or pipeline logs.

### TEST-03 — Minimum observability
- [ ] Add health checks for the Backend integration and execution worker or Jenkins connection.
- [ ] Record job duration, stage status, and failure count.
- [ ] Track failed and stuck jobs for operational review.
- [ ] Document where to find the API, Jenkins, Terraform, Ansible, and Kubernetes logs for an MVP incident.

### TEST-04 — Definition of Done for every MVP Backend and DevOps task
- [ ] Implementation is complete.
- [ ] Authorization and validation are implemented where applicable.
- [ ] The task has a safe failure state and redacted logs.
- [ ] Required automated tests pass.
- [ ] API and Jenkins integration contracts are documented.
- [ ] No credentials or secret values are exposed.
- [ ] Code and infrastructure changes are reviewed and merged.
- [ ] The acceptance criteria have been verified in the non-production MVP environment.

## Suggested MVP Implementation Order

1. [ ] Define project, pipeline, stage, status, and Backend-to-Jenkins contracts.
2. [ ] Prepare the approved AWS, Terraform state, Kubernetes Development target, secret references, and deployment permissions.
3. [ ] Implement secure GitHub repository validation and Dockerfile-only repository analysis.
4. [ ] Implement project setup, deployment request, status, and log APIs.
5. [ ] Configure Jenkins to check out a repository, build and push a Docker image, run Terraform and Ansible, and deploy to Kubernetes.
6. [ ] Connect Jenkins stage callbacks and redacted logs to the Backend status model.
7. [ ] Validate the end-to-end flow from Dashboard deployment request to healthy Kubernetes rollout.
