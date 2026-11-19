// tests/unit/terraform.modules.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('AWS-01 & AWS-02 — Terraform Infrastructure Modules & Security Compliance', () => {
    const terraformDir = path.resolve(__dirname, '../../../terraform');
    const modulesDir = path.join(terraformDir, 'modules');
    const devEnvDir = path.join(terraformDir, 'environments', 'dev');

    it('should have all required modules and environment files present', () => {
        const requiredFiles = [
            path.join(modulesDir, 'remote-state', 'main.tf'),
            path.join(modulesDir, 'remote-state', 'variables.tf'),
            path.join(modulesDir, 'remote-state', 'outputs.tf'),
            path.join(modulesDir, 'vpc', 'main.tf'),
            path.join(modulesDir, 'vpc', 'variables.tf'),
            path.join(modulesDir, 'vpc', 'outputs.tf'),
            path.join(modulesDir, 'eks', 'main.tf'),
            path.join(modulesDir, 'eks', 'variables.tf'),
            path.join(modulesDir, 'eks', 'outputs.tf'),
            path.join(devEnvDir, 'main.tf'),
            path.join(devEnvDir, 'variables.tf'),
            path.join(devEnvDir, 'outputs.tf'),
            path.join(devEnvDir, 'backend.tf'),
        ];

        for (const file of requiredFiles) {
            assert(fs.existsSync(file), `Expected file to exist: ${file}`);
        }
    });

    describe('AWS-01: Remote State Security & State Locking', () => {
        const stateMainTf = fs.readFileSync(path.join(modulesDir, 'remote-state', 'main.tf'), 'utf8');

        it('should enforce S3 bucket versioning for state disaster recovery', () => {
            assert(stateMainTf.includes('aws_s3_bucket_versioning'), 'Must configure S3 bucket versioning');
            assert(stateMainTf.includes('status = "Enabled"'), 'Versioning status must be Enabled');
        });

        it('should enforce AES256 server-side encryption at rest', () => {
            assert(stateMainTf.includes('aws_s3_bucket_server_side_encryption_configuration'));
            assert(stateMainTf.includes('sse_algorithm = "AES256"'));
        });

        it('should block all public access to state bucket', () => {
            assert(stateMainTf.includes('aws_s3_bucket_public_access_block'));
            assert(stateMainTf.includes('block_public_acls       = true'));
            assert(stateMainTf.includes('block_public_policy     = true'));
            assert(stateMainTf.includes('ignore_public_acls      = true'));
            assert(stateMainTf.includes('restrict_public_buckets = true'));
        });

        it('should enforce TLS in transit via bucket policy', () => {
            assert(stateMainTf.includes('aws_s3_bucket_policy'));
            assert(stateMainTf.includes('aws:SecureTransport'));
        });

        it('should configure DynamoDB lock table with LockID primary key', () => {
            assert(stateMainTf.includes('aws_dynamodb_table'));
            assert(stateMainTf.includes('hash_key     = "LockID"'));
            assert(stateMainTf.includes('name = "LockID"'));
        });
    });

    describe('AWS-01 & AWS-02: VPC & Kubernetes Networking Isolation', () => {
        const vpcMainTf = fs.readFileSync(path.join(modulesDir, 'vpc', 'main.tf'), 'utf8');

        it('should isolate private subnets and configure NAT Gateway', () => {
            assert(vpcMainTf.includes('resource "aws_subnet" "public"'), 'Must define public subnets');
            assert(vpcMainTf.includes('resource "aws_subnet" "private"'), 'Must define private subnets');
            assert(vpcMainTf.includes('resource "aws_nat_gateway" "nat"'), 'Must define NAT Gateway');
            assert(vpcMainTf.includes('resource "aws_eip" "nat"'), 'Must allocate Elastic IP for NAT');
        });

        it('should configure Kubernetes load balancer discovery tags', () => {
            assert(vpcMainTf.includes('"kubernetes.io/role/elb"'));
            assert(vpcMainTf.includes('"kubernetes.io/role/internal-elb"'));
            assert(vpcMainTf.includes('"kubernetes.io/cluster/${var.cluster_name}"'));
        });
    });

    describe('AWS-02: EKS Cluster Target & Least-Privilege IAM', () => {
        const eksMainTf = fs.readFileSync(path.join(modulesDir, 'eks', 'main.tf'), 'utf8');
        const eksOutputsTf = fs.readFileSync(path.join(modulesDir, 'eks', 'outputs.tf'), 'utf8');

        it('should attach least-privilege IAM policies to cluster and worker nodes', () => {
            assert(eksMainTf.includes('arn:aws:iam::aws:policy/AmazonEKSClusterPolicy'));
            assert(eksMainTf.includes('arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy'));
            assert(eksMainTf.includes('arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy'));
            assert(eksMainTf.includes('arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'));
        });

        it('should deploy managed node group into private subnets only', () => {
            assert(eksMainTf.includes('resource "aws_eks_node_group" "main"'));
            assert(eksMainTf.includes('subnet_ids      = var.private_subnet_ids'), 'Worker nodes must strictly use private subnets');
        });

        it('should configure OIDC Identity Provider for IRSA', () => {
            assert(eksMainTf.includes('aws_iam_openid_connect_provider'), 'Must configure OIDC provider for IRSA');
        });

        it('should mark certificate authority data as sensitive in outputs', () => {
            assert(eksOutputsTf.includes('sensitive   = true'), 'Cluster CA data must be flagged sensitive to prevent log leakage');
        });
    });

    describe('Dev Environment Root Composition', () => {
        const backendTf = fs.readFileSync(path.join(devEnvDir, 'backend.tf'), 'utf8');
        const devMainTf = fs.readFileSync(path.join(devEnvDir, 'main.tf'), 'utf8');

        it('should configure remote S3 backend with encryption and DynamoDB lock table', () => {
            assert(backendTf.includes('backend "s3"'));
            assert(backendTf.includes('dynamodb_table = "iiap-terraform-locks"'));
            assert(backendTf.includes('encrypt        = true'));
        });

        it('should instantiate both VPC and EKS modules', () => {
            assert(devMainTf.includes('module "vpc"'));
            assert(devMainTf.includes('module "eks"'));
        });
    });
});
