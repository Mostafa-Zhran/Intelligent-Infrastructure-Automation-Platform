# Terraform Infrastructure as Code (IaC) — IIAP

This directory contains the version-controlled Terraform modules and environment configurations for the **Intelligent Infrastructure Automation Platform (IIAP)**.

## Architecture & Modules

```text
terraform/
├── environments/
│   └── dev/                  # Development environment root composition
│       ├── backend.tf        # Remote S3 state backend with DynamoDB locking
│       ├── main.tf           # Instantiates VPC and EKS modules
│       ├── variables.tf      # Configurable inputs with strict defaults
│       ├── outputs.tf        # Safe metadata exports (cluster name, endpoint, OIDC)
│       └── terraform.tfvars.example
└── modules/
    ├── remote-state/         # S3 Bucket (AES256, versioning, TLS enforce) + DynamoDB lock table
    ├── vpc/                  # VPC, 2 public subnets, 2 private subnets, NAT GW, route tables
    └── eks/                  # EKS cluster control plane, managed node group, IRSA OIDC, least-privilege IAM
```

## Security & Compliance (AWS-01 & AWS-02)

1. **State Locking & Integrity**:
   - S3 Bucket with `versioning_configuration` to enable disaster recovery and rollback.
   - S3 `aws_s3_bucket_public_access_block` blocks all public access.
   - Enforced TLS 1.2+ encryption in transit via S3 bucket policy.
   - Server-side AES-256 encryption at rest.
   - DynamoDB table with `LockID` primary key prevents conflicting concurrent operations.

2. **Network Isolation**:
   - Worker nodes run strictly in **private subnets** with outbound internet access via a NAT Gateway.
   - EKS control plane has private endpoint access enabled.
   - Subnets carry Kubernetes discovery tags (`kubernetes.io/role/elb` and `kubernetes.io/role/internal-elb`).

3. **Least-Privilege IAM & IRSA**:
   - Dedicated IAM roles for the EKS Control Plane (`AmazonEKSClusterPolicy`, `AmazonEKSVPCResourceController`).
   - Dedicated IAM role for Worker Nodes (`AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`).
   - OIDC Identity Provider configured for Kubernetes ServiceAccount IAM roles (IRSA).

4. **Zero Secret Exposure**:
   - Sensitive certificate authority data is marked `sensitive = true`.
   - No plaintext passwords, keys, or tokens stored in code or repository logs.
