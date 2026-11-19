variable "bucket_name" {
  description = "Unique name for the S3 bucket storing Terraform remote state"
  type        = string
}

variable "lock_table_name" {
  description = "Name for the DynamoDB table used for Terraform state locking"
  type        = string
  default     = "iiap-terraform-locks"
}

variable "environment" {
  description = "Deployment environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Resource tags to assign to the state resources"
  type        = map(string)
  default     = {}
}
