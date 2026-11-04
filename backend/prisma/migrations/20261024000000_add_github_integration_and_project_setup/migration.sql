-- إضافة نوع حالة إعداد المشروع
CREATE TYPE "app"."project_setup_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'FAILED');

-- جدول اتصال GitHub لكل مستخدم
CREATE TABLE "app"."github_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "github_user_id" VARCHAR(50) NOT NULL,
    "github_login" VARCHAR(100) NOT NULL,
    "token_ciphertext" TEXT NOT NULL,
    "token_iv" VARCHAR(24) NOT NULL,
    "token_tag" VARCHAR(32) NOT NULL,
    "token_key_version" INTEGER NOT NULL DEFAULT 1,
    "token_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "token_expires_at" TIMESTAMPTZ(6),
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_reason" TEXT,

    CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "github_connections_user_id_key"
ON "app"."github_connections"("user_id");

CREATE INDEX "github_connections_github_user_idx"
ON "app"."github_connections"("github_user_id");

ALTER TABLE "app"."github_connections"
ADD CONSTRAINT "github_connections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app"."users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- جدول حالات OAuth المؤقتة
CREATE TABLE "app"."github_oauth_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "state_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "github_oauth_states_state_hash_key"
ON "app"."github_oauth_states"("state_hash");

CREATE INDEX "github_oauth_states_user_expiry_idx"
ON "app"."github_oauth_states"("user_id", "expires_at");

ALTER TABLE "app"."github_oauth_states"
ADD CONSTRAINT "github_oauth_states_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app"."users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- إضافة حقول GitHub وحالة الإعداد إلى المشاريع
ALTER TABLE "app"."projects"
ADD COLUMN "github_repo_id" VARCHAR(50),
ADD COLUMN "github_repo_owner" VARCHAR(100),
ADD COLUMN "github_repo_full_name" VARCHAR(300),
ADD COLUMN "repository_branch" VARCHAR(255),
ADD COLUMN "setup_status" "app"."project_setup_status" NOT NULL DEFAULT 'PENDING';

-- منع تكرار نفس المستودع لنفس البيئة على مستوى المنصة
CREATE UNIQUE INDEX "projects_repo_environment_uq"
ON "app"."projects"("github_repo_id", "default_environment")
WHERE "github_repo_id" IS NOT NULL;