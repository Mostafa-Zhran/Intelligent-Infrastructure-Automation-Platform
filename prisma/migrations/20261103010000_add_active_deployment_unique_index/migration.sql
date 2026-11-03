-- Create partial unique index to prevent concurrent active deployments for the same project and environment
CREATE UNIQUE INDEX "deployments_active_project_env_uq"
ON "app"."deployments" ("project_id", "environment")
WHERE "status" IN ('QUEUED', 'RUNNING');

