export type PlatformRole = 'USER' | 'ADMIN';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  platform_role: PlatformRole;
  status: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const TOKEN_STORAGE_KEY = 'iiap_access_token';

// In local dev, use relative path so Vite proxy forwards requests with zero CORS issues.
// In production, use configured remote Backend_API.
const rawBackendUrl = String(import.meta.env.Backend_API || import.meta.env.BACKEND_API || import.meta.env.VITE_API_URL || '').trim();
const BACKEND_URL = import.meta.env.DEV
  ? ''
  : (rawBackendUrl
      ? (rawBackendUrl.startsWith('http://') || rawBackendUrl.startsWith('https://')
          ? rawBackendUrl
          : `https://${rawBackendUrl}`
        ).replace(/\/$/, '')
      : '');

const API_BASE = `${BACKEND_URL}/api/v1/auth`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const authApi = {
  async signUp(body: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ user: ApiUser; accessToken?: string }> {
    const res = await request<ApiResponse<{ user: ApiUser; accessToken?: string }>>('/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.data?.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.accessToken);
    }
    return res.data!;
  },

  async signIn(body: {
    email: string;
    password: string;
  }): Promise<{ user: ApiUser; accessToken?: string }> {
    const res = await request<ApiResponse<{ user: ApiUser; accessToken?: string }>>('/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.data?.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.accessToken);
    }
    return res.data!;
  },

  async signOut(): Promise<{ message?: string }> {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    return request<ApiResponse>('/signout', {
      method: 'POST',
    });
  },

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  },

  async getProfile(): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/profile', {
      method: 'GET',
    });
    return res.data!;
  },

  async updateProfile(body: {
    name?: string;
    email?: string;
    avatar?: string;
    avatarUrl?: string;
    avatar_url?: string;
  }): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async uploadAvatar(avatar: string): Promise<{ avatarUrl: string; user: ApiUser }> {
    const res = await request<ApiResponse<{ avatarUrl: string; user: ApiUser }>>('/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar }),
    });
    return res.data!;
  },

  async changePassword(body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message?: string }> {
    return request<ApiResponse>('/change-password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async forgotPassword(body: { email: string }): Promise<{ message?: string }> {
    return request<ApiResponse>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async resetPassword(body: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ message?: string }> {
    return request<ApiResponse>('/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

export interface GitHubStatus {
  connected: boolean;
  githubLogin?: string;
  githubUserId?: string;
  scopes?: string[];
  connectedAt?: string;
}

export interface GitHubAccountOption {
  type: 'user' | 'organization';
  login: string;
  id: string;
  avatarUrl?: string;
}

export interface GitHubRepoOption {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch?: string;
  updatedAt?: string;
  htmlUrl?: string;
}

export interface GitHubBranchOption {
  name: string;
  isDefault: boolean;
  protected: boolean;
}

const GITHUB_API_BASE = `${BACKEND_URL}/api/v1/integrations/github`;

async function githubRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const githubApi = {
  async getStatus(): Promise<GitHubStatus> {
    const res = await githubRequest<ApiResponse<GitHubStatus>>('/status', { method: 'GET' });
    return res.data!;
  },

  async startConnect(returnTo = '/new-project'): Promise<{ authorizationUrl: string; expiresAt: string; scopes: string[] }> {
    const res = await githubRequest<ApiResponse<{ authorizationUrl: string; expiresAt: string; scopes: string[] }>>(`/connect?returnTo=${encodeURIComponent(returnTo)}`, { method: 'GET' });
    return res.data!;
  },

  async getOrganizations(): Promise<{ account: GitHubAccountOption; organizations: GitHubAccountOption[] }> {
    const res = await githubRequest<ApiResponse<{ account: GitHubAccountOption; organizations: GitHubAccountOption[] }>>('/organizations', { method: 'GET' });
    return res.data!;
  },

  async getRepositories(owner: string, page = 1, perPage = 100): Promise<{ repositories: GitHubRepoOption[]; totalCount?: number }> {
    const res = await githubRequest<ApiResponse<{ repositories: GitHubRepoOption[]; totalCount?: number }>>(`/repositories?owner=${encodeURIComponent(owner)}&page=${page}&per_page=${perPage}`, { method: 'GET' });
    return res.data!;
  },

  async getBranches(owner: string, repo: string): Promise<{ repository: any; branches: GitHubBranchOption[]; emptyRepository: boolean }> {
    const res = await githubRequest<ApiResponse<{ repository: any; branches: GitHubBranchOption[]; emptyRepository: boolean }>>(`/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`, { method: 'GET' });
    return res.data!;
  },
};


export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  repositoryUrl?: string | null;
  repositoryBranch?: string | null;
  defaultEnvironment: string;
  setupStatus: string;
  githubRepoId?: string | null;
  githubRepoOwner?: string | null;
  githubRepoFullName?: string | null;
  createdAt: string;
  updatedAt: string;
  latestDeployment?: {
    id: string;
    status: string;
    environment: string;
    commitSha?: string;
    branch?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
  repositoryBranch?: string;
  defaultEnvironment?: string;
  githubRepoId?: string | number | null;
  githubRepoOwner?: string | null;
  githubRepoFullName?: string | null;
  buildCommand?: string;
  outputDirectory?: string;
  envVars?: { key: string; value: string }[];
}

const PROJECTS_API_BASE = `${BACKEND_URL}/api/projects`;

async function projectsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${PROJECTS_API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const projectsApi = {
  async list(): Promise<{ projects: Project[] }> {
    const res = await projectsRequest<ApiResponse<{ projects: Project[] }>>('/', { method: 'GET' });
    return res.data!;
  },

  async create(payload: CreateProjectPayload): Promise<{ project: Project }> {
    const res = await projectsRequest<ApiResponse<{ project: Project }>>('/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async getById(projectId: string): Promise<{ project: Project }> {
    const res = await projectsRequest<ApiResponse<{ project: Project }>>(`/${projectId}`, { method: 'GET' });
    return res.data!;
  },

  async getDeployments(
    projectId: string,
    params: { page?: number; per_page?: number; environment?: string; status?: string } = {}
  ): Promise<{
    deployments: ApiDeployment[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.environment) query.set('environment', params.environment);
    if (params.status) query.set('status', params.status);

    const qs = query.toString();
    const endpoint = `/${projectId}/deployments${qs ? `?${qs}` : ''}`;
    const res = await projectsRequest<ApiResponse<any>>(endpoint, { method: 'GET' });
    return res.data!;
  },

  async analyzeRepository(payload: {
    owner: string;
    repo: string;
    branch?: string;
    dockerfilePath?: string;
  }): Promise<AnalyzeRepositoryResult> {
    const res = await projectsRequest<ApiResponse<AnalyzeRepositoryResult>>('/analyze-repository', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async delete(projectId: string): Promise<{ id: string; deleted: boolean }> {
    const res = await projectsRequest<ApiResponse<{ id: string; deleted: boolean }>>(`/${projectId}`, {
      method: 'DELETE',
    });
    return res.data!;
  },
};

export interface Ec2TargetConfig {
  id: string;
  projectId: string;
  publicIp: string;
  sshUser: string;
  sshPort: number;
  authType: 'SSH_KEY';
  dockerfilePath: string;
  awsRegion: string;
  hostPort: number;
  containerPort: number;
  healthStatus: 'UNVERIFIED' | 'ONLINE' | 'UNREACHABLE' | 'AUTH_FAILED';
  dockerVersion: string | null;
  lastVerifiedAt: string | null;
  hasSshKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveEc2ConfigPayload {
  publicIp: string;
  sshUser?: string;
  sshPort?: number;
  sshPrivateKey?: string;
  dockerfilePath?: string;
  awsRegion?: string;
  hostPort?: number;
  containerPort?: number;
}

export interface Ec2VerifyResult {
  reachable: boolean;
  portOpen: boolean;
  authenticated: boolean;
  osInfo: string;
  dockerInstalled: boolean;
  dockerVersion: string | null;
  canRunDockerWithoutSudo: boolean;
  hasSudoAccess: boolean;
}

export const ec2ConfigApi = {
  async saveConfig(projectId: string, payload: SaveEc2ConfigPayload): Promise<{ target: Ec2TargetConfig }> {
    const res = await projectsRequest<ApiResponse<{ target: Ec2TargetConfig }>>(`/${projectId}/ec2-config`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async getConfig(projectId: string): Promise<{ target: Ec2TargetConfig | null }> {
    const res = await projectsRequest<ApiResponse<{ target: Ec2TargetConfig | null }>>(`/${projectId}/ec2-config`, {
      method: 'GET',
    });
    return res.data!;
  },

  async verifyConnection(projectId: string): Promise<Ec2VerifyResult> {
    const res = await projectsRequest<ApiResponse<Ec2VerifyResult>>(`/${projectId}/ec2-verify`, {
      method: 'POST',
    });
    return res.data!;
  },
};

export interface AwsClusterTargetConfig {
  id: string;
  projectId: string;
  authMode: 'IAM_ROLE' | 'ACCESS_KEYS';
  awsRegion: string;
  roleArn: string | null;
  externalId: string | null;
  accessKeyId: string | null;
  hasSecretKey: boolean;
  clusterName: string;
  nodeInstanceType: string;
  desiredNodes: number;
  kubernetesVersion: string;
  clusterEndpoint: string | null;
  status: 'UNVERIFIED' | 'PROVISIONING' | 'ONLINE' | 'FAILED';
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAwsClusterConfigPayload {
  authMode: 'IAM_ROLE' | 'ACCESS_KEYS';
  awsRegion?: string;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  clusterName?: string;
  nodeInstanceType?: string;
  desiredNodes?: number;
  kubernetesVersion?: string;
}

export interface AwsClusterVerifyResult {
  verified: boolean;
  authMode: 'IAM_ROLE' | 'ACCESS_KEYS';
  awsRegion: string;
  clusterName: string;
  target: AwsClusterTargetConfig;
}

export const awsClusterConfigApi = {
  async saveConfig(
    projectId: string,
    payload: SaveAwsClusterConfigPayload
  ): Promise<{ target: AwsClusterTargetConfig }> {
    const res = await projectsRequest<ApiResponse<{ target: AwsClusterTargetConfig }>>(
      `/${projectId}/cluster-config`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data!;
  },

  async getConfig(projectId: string): Promise<{ target: AwsClusterTargetConfig | null }> {
    const res = await projectsRequest<ApiResponse<{ target: AwsClusterTargetConfig | null }>>(
      `/${projectId}/cluster-config`,
      {
        method: 'GET',
      }
    );
    return res.data!;
  },

  async verifyCredentials(projectId: string): Promise<AwsClusterVerifyResult> {
    const res = await projectsRequest<ApiResponse<AwsClusterVerifyResult>>(
      `/${projectId}/cluster-verify`,
      {
        method: 'POST',
      }
    );
    return res.data!;
  },
};

export interface AnalyzeRepositoryResult {
  supported: boolean;
  hasDockerfile?: boolean;
  repository: string;
  branch: string;
  dockerfilePath: string | null;
  detectedFiles: string[];
  manifests: string[];
  framework: string | null;
  reason: string | null;
  analyzedAt: string;
}


export interface ApiDeployment {
  id: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
    slug: string;
    githubRepoFullName?: string;
  } | null;
  environment: string;
  status: string;
  branch?: string | null;
  commitSha?: string | null;
  repositoryUrl?: string | null;
  replicas: number;
  errorMessage?: string | null;
  serviceUrl?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  ciJob?: {
    id: string;
    provider: string;
    jobName: string;
    externalJobId?: string | null;
    status: string;
    url?: string | null;
  } | null;
}

const DEPLOYMENTS_API_BASE = `${BACKEND_URL}/api/deployments`;

async function deploymentsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${DEPLOYMENTS_API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const deploymentsApi = {
  async list(params: {
    page?: number;
    per_page?: number;
    status?: string;
    environment?: string;
  } = {}): Promise<{
    deployments: ApiDeployment[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.environment) query.set('environment', params.environment);

    const qs = query.toString();
    const endpoint = qs ? `/?${qs}` : '/';
    const res = await deploymentsRequest<ApiResponse<{
      deployments: ApiDeployment[];
      pagination: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
      };
    }>>(endpoint, { method: 'GET' });
    return res.data!;
  },

  async getById(deploymentId: string): Promise<{ deployment: ApiDeployment & { steps: any[]; events: any[] } }> {
    const res = await deploymentsRequest<ApiResponse<{ deployment: ApiDeployment & { steps: any[]; events: any[] } }>>(
      `/${deploymentId}`,
      { method: 'GET' }
    );
    return res.data!;
  },

  async getLogs(
    deploymentId: string,
    params: { limit?: number; level?: string; step_id?: string } = {}
  ): Promise<{
    deploymentId: string;
    status: string;
    totalReturned: number;
    truncated: boolean;
    logs: {
      id: string;
      stepId?: string;
      source: string;
      level: string;
      message: string;
      loggedAt: string;
    }[];
  }> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.level) query.set('level', params.level);
    if (params.step_id) query.set('step_id', params.step_id);

    const qs = query.toString();
    const endpoint = `/${deploymentId}/logs${qs ? `?${qs}` : ''}`;
    const res = await deploymentsRequest<ApiResponse<any>>(endpoint, { method: 'GET' });
    return res.data!;
  },

  async submit(
    projectId: string,
    payload: {
      branch?: string;
      commitSha?: string;
      environment?: string;
    } = {}
  ): Promise<{
    deploymentId: string;
    status: string;
    environment: string;
    branch?: string;
    commitSha?: string;
  }> {
    const res = await projectsRequest<ApiResponse<any>>(`/${projectId}/deployments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },
};


export interface DashboardMetrics {
  totalProjects: number;
  runningDeployments: number;
  failedDeployments: number;
  succeededDeployments: number;
}

export interface DashboardRecentDeployment {
  id: string;
  projectId: string;
  projectName: string;
  repository: string;
  environment: string;
  status: string;
  branch: string;
  commitSha?: string | null;
  errorSummary?: string | null;
  author: string;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
}

export interface DashboardSummaryData {
  metrics: DashboardMetrics;
  projects: Project[];
  recentDeployments: DashboardRecentDeployment[];
}

const DASHBOARD_API_BASE = `${BACKEND_URL}/api/dashboard`;

async function dashboardRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${DASHBOARD_API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummaryData> {
    const res = await dashboardRequest<ApiResponse<DashboardSummaryData>>('/', { method: 'GET' });
    return res.data!;
  },

  async getRecentDeployments(limit = 10): Promise<{
    total: number;
    limit: number;
    deployments: DashboardRecentDeployment[];
  }> {
    const res = await dashboardRequest<ApiResponse<{
      total: number;
      limit: number;
      deployments: DashboardRecentDeployment[];
    }>>(`/recent-deployments?limit=${limit}`, { method: 'GET' });
    return res.data!;
  },
};

export interface EnvVarEntry {
  id: string;
  key: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export const envVarsApi = {
  async list(projectId: string): Promise<{ vars: EnvVarEntry[] }> {
    const res = await projectsRequest<ApiResponse<{ vars: EnvVarEntry[] }>>(
      `/${projectId}/env-vars`,
      { method: 'GET' }
    );
    return res.data!;
  },

  async save(
    projectId: string,
    payload: { key: string; value: string; isSecret?: boolean }
  ): Promise<{ key: string; isSecret: boolean; saved: boolean }> {
    const res = await projectsRequest<ApiResponse<{ key: string; isSecret: boolean; saved: boolean }>>(
      `/${projectId}/env-vars`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data!;
  },

  async remove(projectId: string, key: string): Promise<{ key: string; deleted: boolean }> {
    const res = await projectsRequest<ApiResponse<{ key: string; deleted: boolean }>>(
      `/${projectId}/env-vars/${encodeURIComponent(key)}`,
      { method: 'DELETE' }
    );
    return res.data!;
  },
};

export interface RuntimeStatus {
  containerName: string;
  running: boolean;
  status: string;
  image: string | null;
  startedAt: string | null;
  ports: string | null;
}

export const runtimeApi = {
  async getStatus(projectId: string): Promise<RuntimeStatus> {
    const res = await projectsRequest<ApiResponse<RuntimeStatus>>(
      `/${projectId}/runtime/status`,
      { method: 'GET' }
    );
    return res.data!;
  },

  async getLogs(projectId: string, tail = 200): Promise<{ containerName: string; lines: string[] }> {
    const res = await projectsRequest<ApiResponse<{ containerName: string; lines: string[] }>>(
      `/${projectId}/runtime/logs?tail=${tail}`,
      { method: 'GET' }
    );
    return res.data!;
  },

  async restart(projectId: string): Promise<{ containerName: string; restarted: boolean }> {
    const res = await projectsRequest<ApiResponse<{ containerName: string; restarted: boolean }>>(
      `/${projectId}/runtime/restart`,
      { method: 'POST' }
    );
    return res.data!;
  },
};
