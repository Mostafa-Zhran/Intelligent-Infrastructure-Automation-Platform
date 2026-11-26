# IIAP Kubernetes Manifest Templates

Parameterized Kubernetes manifests used by `byoc-cluster.orchestrator.js` when deploying applications to user-owned AWS EKS clusters (BYOC Cluster Mode).

Placeholders replaced at deploy time:
- `__NAMESPACE__`: Isolated project namespace (`iiap-<project-slug>`)
- `__APP_NAME__`: Sanitized application name (`iiap-<project-slug>`)
- `__IMAGE_URI__`: Built Docker image URI pushed to AWS ECR (or registry)
- `__REPLICAS__`: Desired pod replica count
- `__CONTAINER_PORT__`: Application container port
- `__SECRET_NAME__`: Kubernetes Secret name (`iiap-env-secret`) holding encrypted project env vars
