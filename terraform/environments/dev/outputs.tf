output "vpc_id" {
  description = "VPC ID of the Development environment"
  value       = module.vpc.vpc_id
}

output "cluster_name" {
  description = "Name of the Development EKS Cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint of the Development EKS Kubernetes API"
  value       = module.eks.cluster_endpoint
}

output "cluster_arn" {
  description = "ARN of the EKS Cluster"
  value       = module.eks.cluster_arn
}

output "oidc_provider_arn" {
  description = "OIDC Provider ARN for IRSA service accounts"
  value       = module.eks.oidc_provider_arn
}
