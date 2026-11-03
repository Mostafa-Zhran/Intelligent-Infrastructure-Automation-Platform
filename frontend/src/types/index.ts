export type PageId = 
  | 'landing'
  | 'signin' 
  | 'signup' 
  | 'forgot-password' 
  | 'reset-password'
  | 'reset-link-expired'
  | 'profile' 
  | 'no-access'
  | 'dashboard'
  | 'projects'
  | 'new-project'
  | 'project-details'
  | 'deployments'
  | 'deployment-details'
  | 'deployment-logs';

export type PlatformRole = 'USER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string;
  isVerified: boolean;
  role: PlatformRole | string;
  status?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export type DeploymentStatus = 'Succeeded' | 'Running' | 'Failed' | 'Queued';

export interface ProjectItem {
  id: string;
  name: string;
  repository: string;
  environment: string;
  status: DeploymentStatus;
  branch?: string;
  lastDeployment?: string;
  buildCommand?: string;
  outputDirectory?: string;
  envVars?: { key: string; value: string }[];
}

export interface DeploymentRecord {
  id: string;
  project: string;
  environment: string;
  status: DeploymentStatus;
  startedAt: string;
  errorDetails?: string;
  branch?: string;
  commitHash?: string;
  commitMessage?: string;
  author?: string;
  duration?: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  runningDeployments: number;
  failedDeployments: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  duration?: string;
  stepNumber: number;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'RUNTIME';
  message: string;
  lineNumber: number;
}
