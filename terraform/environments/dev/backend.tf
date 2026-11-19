# ==============================================================================
# S3 Remote State Backend with DynamoDB State Locking
# Implements: AWS-01 (Remote state backend, locking, access control)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "iiap-dev-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "iiap-terraform-locks"
    encrypt        = true
  }
}
