# Root Dockerfile for IIAP Backend + BYOC DevOps CLIs (Terraform, AWS CLI v2, kubectl, Git)
FROM node:22-bookworm-slim

ARG TARGETARCH=amd64
ARG TERRAFORM_VERSION=1.9.8

ENV DEBIAN_FRONTEND=noninteractive

# Base utilities + git + ssh client
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    zip \
    git \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform CLI
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") \
    && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${ARCH}.zip" -o /tmp/terraform.zip \
    && unzip -q /tmp/terraform.zip -d /usr/local/bin \
    && rm -f /tmp/terraform.zip \
    && terraform version

# Install AWS CLI v2
RUN AWS_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") \
    && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/aws /tmp/awscliv2.zip \
    && aws --version

# Install kubectl
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") \
    && KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt) \
    && curl -fsSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl" -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client

WORKDIR /app

# Install backend dependencies & generate Prisma Client
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY backend/prisma.config.js ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev --ignore-scripts \
    && npx prisma generate --schema=prisma/schema.prisma

# Copy backend source + Terraform + Kubernetes manifests
WORKDIR /app
COPY backend/ ./backend/
COPY terraform/ ./terraform/
COPY manifests/ ./manifests/

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
