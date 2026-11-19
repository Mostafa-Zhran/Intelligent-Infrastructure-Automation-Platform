output "bucket_id" {
  description = "The ID / name of the S3 state bucket"
  value       = aws_s3_bucket.terraform_state.id
}

output "bucket_arn" {
  description = "The ARN of the S3 state bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "The name of the DynamoDB lock table"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "lock_table_arn" {
  description = "The ARN of the DynamoDB lock table"
  value       = aws_dynamodb_table.terraform_locks.arn
}
