# ==============================================================================
# Development Environment Root Module
# Implements: AWS-01 (Provisioning), AWS-02 (Cluster target configuration)
# ==============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "IIAP"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. VPC Module
module "vpc" {
  source = "../../modules/vpc"

  name_prefix          = "iiap-${var.environment}"
  environment          = var.environment
  cluster_name         = var.cluster_name
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  tags = {
    Environment = var.environment
  }
}

# 2. EKS Cluster Module
module "eks" {
  source = "../../modules/eks"

  cluster_name        = var.cluster_name
  environment         = var.environment
  kubernetes_version  = var.kubernetes_version
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  node_instance_types = var.node_instance_types
  desired_node_count  = var.desired_node_count
  min_node_count      = var.min_node_count
  max_node_count      = var.max_node_count

  tags = {
    Environment = var.environment
  }
}
