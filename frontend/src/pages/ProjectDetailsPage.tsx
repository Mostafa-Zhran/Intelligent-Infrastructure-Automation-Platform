import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Cpu,
  Plus,
  FileCode,
  Server,
  Zap,
  Settings,
  Eye,
  EyeOff,
  Save,
  Shield,
  KeyRound,
  Trash2,
  Terminal,
  RotateCw,
} from 'lucide-react';
import { PageId } from '../types';
import {
  projectsApi,
  deploymentsApi,
  ec2ConfigApi,
  awsClusterConfigApi,
  envVarsApi,
  runtimeApi,
  Project,
  ApiDeployment,
  Ec2TargetConfig,
  AwsClusterTargetConfig,
  EnvVarEntry,
  RuntimeStatus,
} from '../services/api';
import { ProjectIcon } from '../components/common/BrandLogo';

interface ProjectDetailsPageProps {
  project?: any;
  onNavigate: (page: PageId) => void;
  onSelectDeployment?: (deployment: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ProjectDetailsPage: React.FC<ProjectDetailsPageProps> = ({
  project: initialProject,
  onNavigate,
  onSelectDeployment,
  onShowToast,
}) => {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [deployments, setDeployments] = useState<ApiDeployment[]>([]);
  const [activeTab, setActiveTab] = useState<'deployments' | 'manifest' | 'topology' | 'env' | 'settings'>('deployments');
  const [isLoading, setIsLoading] = useState<boolean>(!initialProject);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [deployBranch, setDeployBranch] = useState<string>('main');
  const [ec2Target, setEc2Target] = useState<Ec2TargetConfig | null>(null);
  const [isVerifyingEc2, setIsVerifyingEc2] = useState<boolean>(false);

  // BYOC AWS EKS Cluster state
  const [clusterTarget, setClusterTarget] = useState<AwsClusterTargetConfig | null>(null);
  const [clusterAuthMode, setClusterAuthMode] = useState<'IAM_ROLE' | 'ACCESS_KEYS'>('IAM_ROLE');
  const [clusterRoleArn, setClusterRoleArn] = useState<string>('');
  const [clusterExternalId, setClusterExternalId] = useState<string>('');
  const [clusterAccessKeyId, setClusterAccessKeyId] = useState<string>('');
  const [clusterSecretKey, setClusterSecretKey] = useState<string>('');
  const [clusterRegion, setClusterRegion] = useState<string>('us-east-1');
  const [clusterName, setClusterName] = useState<string>('');
  const [clusterInstanceType, setClusterInstanceType] = useState<string>('t3.medium');
  const [clusterDesiredNodes, setClusterDesiredNodes] = useState<number>(2);
  const [isSavingCluster, setIsSavingCluster] = useState<boolean>(false);
  const [isVerifyingCluster, setIsVerifyingCluster] = useState<boolean>(false);

  // EC2 Settings form state
  const [ec2PublicIp, setEc2PublicIp] = useState<string>('');
  const [ec2SshUser, setEc2SshUser] = useState<string>('ubuntu');
  const [ec2SshPort, setEc2SshPort] = useState<number>(22);
  const [ec2SshKey, setEc2SshKey] = useState<string>('');
  const [ec2ShowKey, setEc2ShowKey] = useState<boolean>(false);
  const [ec2HostPort, setEc2HostPort] = useState<number>(80);
  const [ec2ContainerPort, setEc2ContainerPort] = useState<number>(3000);
  const [ec2DockerfilePath, setEc2DockerfilePath] = useState<string>('Dockerfile');
  const [ec2AwsRegion, setEc2AwsRegion] = useState<string>('us-east-1');
  const [isSavingEc2, setIsSavingEc2] = useState<boolean>(false);

  // Environment Variables Manager state
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);
  const [newEnvKey, setNewEnvKey] = useState<string>('');
  const [newEnvValue, setNewEnvValue] = useState<string>('');
  const [newEnvSecret, setNewEnvSecret] = useState<boolean>(true);
  const [isSavingEnv, setIsSavingEnv] = useState<boolean>(false);

  // Runtime Container Controls state
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>([]);
  const [runtimeContainerName, setRuntimeContainerName] = useState<string>('');
  const [isLoadingRuntime, setIsLoadingRuntime] = useState<boolean>(false);
  const [isRestartingContainer, setIsRestartingContainer] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);

  // Delete project confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);
  const [isDeletingEc2, setIsDeletingEc2] = useState<boolean>(false);
  const [isDeletingCluster, setIsDeletingCluster] = useState<boolean>(false);

  // Destroy AWS infrastructure confirmation state
  const [isDestroyModalOpen, setIsDestroyModalOpen] = useState<boolean>(false);
  const [isDestroyingInfra, setIsDestroyingInfra] = useState<boolean>(false);

  const projectId = initialProject?.id;

  const syncEc2Form = (target: Ec2TargetConfig | null) => {
    if (!target) return;
    setEc2PublicIp(target.publicIp || '');
    setEc2SshUser(target.sshUser || 'ubuntu');
    setEc2SshPort(target.sshPort || 22);
    setEc2HostPort(target.hostPort || 80);
    setEc2ContainerPort(target.containerPort || 3000);
    setEc2DockerfilePath(target.dockerfilePath || 'Dockerfile');
    setEc2AwsRegion(target.awsRegion || 'us-east-1');
    setEc2SshKey('');
  };

  const syncClusterForm = (target: AwsClusterTargetConfig | null) => {
    if (!target) return;
    setClusterAuthMode(target.authMode || 'IAM_ROLE');
    setClusterRoleArn(target.roleArn || '');
    setClusterExternalId(target.externalId || '');
    setClusterRegion(target.awsRegion || 'us-east-1');
    setClusterName(target.clusterName || '');
    setClusterInstanceType(target.nodeInstanceType || 't3.medium');
    setClusterDesiredNodes(target.desiredNodes || 2);
    setClusterAccessKeyId('');
    setClusterSecretKey('');
  };

  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
      loadDeployments(projectId);
      ec2ConfigApi
        .getConfig(projectId)
        .then((res) => {
          setEc2Target(res.target);
          syncEc2Form(res.target);
        })
        .catch(() => {});
      awsClusterConfigApi
        .getConfig(projectId)
        .then((res) => {
          setClusterTarget(res.target);
          syncClusterForm(res.target);
        })
        .catch(() => {});
      loadEnvVars(projectId);
    } else {
      setIsLoading(false);
      setIsLoadingDeployments(false);
    }
  }, [projectId]);

  const handleSaveEc2Config = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    const trimmedIp = ec2PublicIp.trim();
    if (!trimmedIp) {
      onShowToast?.('error', 'Validation Error', 'EC2 Public IP or hostname is required.');
      return;
    }

    const trimmedKey = ec2SshKey.trim();
    if (!ec2Target?.hasSshKey && !trimmedKey) {
      onShowToast?.('error', 'SSH Key Required', 'Please provide an SSH Private Key for the initial EC2 setup.');
      return;
    }

    setIsSavingEc2(true);
    try {
      const payload: any = {
        publicIp: trimmedIp,
        sshUser: ec2SshUser.trim() || 'ubuntu',
        sshPort: Number(ec2SshPort) || 22,
        hostPort: Number(ec2HostPort) || 80,
        containerPort: Number(ec2ContainerPort) || 3000,
        dockerfilePath: ec2DockerfilePath.trim() || 'Dockerfile',
        awsRegion: ec2AwsRegion.trim() || 'us-east-1',
      };
      if (trimmedKey) {
        payload.sshPrivateKey = trimmedKey;
      }

      const res = await ec2ConfigApi.saveConfig(projectId, payload);
      setEc2Target(res.target);
      syncEc2Form(res.target);
      onShowToast?.('success', 'EC2 Target Saved', `Configuration updated for ${res.target.publicIp}`);
    } catch (err: any) {
      onShowToast?.('error', 'Save Failed', err.message || 'Failed to save EC2 configuration');
    } finally {
      setIsSavingEc2(false);
    }
  };

  const handleVerifyEc2 = async () => {
    if (!projectId) return;
    setIsVerifyingEc2(true);
    try {
      const res = await ec2ConfigApi.verifyConnection(projectId);
      onShowToast?.('success', 'EC2 SSH Online', `${res.osInfo}${res.dockerInstalled ? ` • ${res.dockerVersion}` : ' • Docker will auto-install'}`);
      const updated = await ec2ConfigApi.getConfig(projectId);
      setEc2Target(updated.target);
    } catch (err: any) {
      onShowToast?.('error', 'EC2 SSH Failed', err.message || 'Could not reach EC2 host');
      const updated = await ec2ConfigApi.getConfig(projectId).catch(() => null);
      if (updated) setEc2Target(updated.target);
    } finally {
      setIsVerifyingEc2(false);
    }
  };

  const loadEnvVars = async (id: string) => {
    setIsLoadingEnv(true);
    try {
      const res = await envVarsApi.list(id);
      setEnvVars(res.vars || []);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const handleSaveEnvVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const key = newEnvKey.trim().toUpperCase();
    if (!key || !newEnvValue) {
      onShowToast?.('error', 'Validation Error', 'Both KEY and VALUE are required.');
      return;
    }
    setIsSavingEnv(true);
    try {
      await envVarsApi.save(projectId, { key, value: newEnvValue, isSecret: newEnvSecret });
      onShowToast?.('success', 'Variable Saved', `${key} encrypted and stored securely.`);
      setNewEnvKey('');
      setNewEnvValue('');
      await loadEnvVars(projectId);
    } catch (err: any) {
      onShowToast?.('error', 'Save Failed', err.message || 'Failed to save environment variable');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const handleDeleteEnvVar = async (key: string) => {
    if (!projectId) return;
    try {
      await envVarsApi.remove(projectId, key);
      onShowToast?.('info', 'Variable Deleted', `${key} removed from project.`);
      setEnvVars((prev) => prev.filter((v) => v.key !== key));
    } catch (err: any) {
      onShowToast?.('error', 'Delete Failed', err.message || 'Failed to delete environment variable');
    }
  };

  const handleViewRuntimeLogs = async () => {
    if (!projectId) return;
    setIsLoadingRuntime(true);
    setIsLogsModalOpen(true);
    try {
      const [statusRes, logsRes] = await Promise.all([
        runtimeApi.getStatus(projectId).catch(() => null),
        runtimeApi.getLogs(projectId, 200),
      ]);
      if (statusRes) setRuntimeStatus(statusRes);
      setRuntimeContainerName(logsRes.containerName);
      setRuntimeLogs(logsRes.lines || []);
    } catch (err: any) {
      setRuntimeLogs([`[ERROR] ${err.message || 'Failed to fetch container logs'}`]);
    } finally {
      setIsLoadingRuntime(false);
    }
  };

  const handleRestartContainer = async () => {
    if (!projectId) return;
    setIsRestartingContainer(true);
    try {
      const res = await runtimeApi.restart(projectId);
      onShowToast?.('success', 'Container Restarted', `Container ${res.containerName} restarted successfully.`);
      const statusRes = await runtimeApi.getStatus(projectId).catch(() => null);
      if (statusRes) setRuntimeStatus(statusRes);
    } catch (err: any) {
      onShowToast?.('error', 'Restart Failed', err.message || 'Failed to restart container');
    } finally {
      setIsRestartingContainer(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project?.id) return;
    setIsDeletingProject(true);
    try {
      await projectsApi.delete(project.id);
      try {
        localStorage.removeItem('iiap_selected_project');
      } catch {}
      setIsDeleteModalOpen(false);
      onShowToast?.('success', 'Project Deleted', `"${project.name}" and its configurations were removed.`);
      onNavigate('projects');
    } catch (err: any) {
      onShowToast?.('error', 'Delete Failed', err.message || 'Could not delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleDeleteEc2Config = async () => {
    if (!projectId) return;
    setIsDeletingEc2(true);
    try {
      await ec2ConfigApi.deleteConfig(projectId);
      setEc2Target(null);
      setEc2PublicIp('');
      setEc2SshKey('');
      onShowToast?.('info', 'EC2 Target Removed', 'EC2 configuration disconnected from this project.');
    } catch (err: any) {
      onShowToast?.('error', 'Remove Failed', err.message || 'Could not remove EC2 target');
    } finally {
      setIsDeletingEc2(false);
    }
  };

  const handleDeleteClusterConfig = async () => {
    if (!projectId) return;
    setIsDeletingCluster(true);
    try {
      await awsClusterConfigApi.deleteConfig(projectId);
      setClusterTarget(null);
      setClusterRoleArn('');
      setClusterExternalId('');
      setClusterAccessKeyId('');
      setClusterSecretKey('');
      onShowToast?.('info', 'Cluster Target Removed', 'AWS BYOC cluster configuration disconnected.');
    } catch (err: any) {
      onShowToast?.('error', 'Remove Failed', err.message || 'Could not remove cluster target');
    } finally {
      setIsDeletingCluster(false);
    }
  };

  /**
   * Runs `terraform destroy` on the backend to delete ALL AWS resources
   * (VPC, EKS, IAM Roles, Node Groups, etc.), then removes the DB config.
   * This can take up to 20 minutes.
   */
  const handleDestroyInfrastructure = async () => {
    if (!projectId) return;
    setIsDestroyingInfra(true);
    setIsDestroyModalOpen(false);
    try {
      const result = await awsClusterConfigApi.destroyInfrastructure(projectId, true);
      setClusterTarget(null);
      setClusterRoleArn('');
      setClusterExternalId('');
      setClusterAccessKeyId('');
      setClusterSecretKey('');
      onShowToast?.(
        'success',
        '✅ AWS Infrastructure Destroyed',
        `Cluster '${result.clusterName}' and all AWS resources deleted from ${result.awsRegion}.`
      );
    } catch (err: any) {
      onShowToast?.('error', 'Destroy Failed', err.message || 'Terraform destroy failed — check AWS Console.');
    } finally {
      setIsDestroyingInfra(false);
    }
  };

  const loadProjectData = async (id: string) => {
    try {
      const data = await projectsApi.getById(id);
      if (data.project) {
        setProject(data.project);
        setDeployBranch(data.project.repositoryBranch || 'main');
      }
    } catch (err: any) {
      onShowToast?.('error', 'Project Load Error', err.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeployments = async (id: string) => {
    setIsLoadingDeployments(true);
    try {
      const data = await projectsApi.getDeployments(id);
      setDeployments(data.deployments || []);
    } catch {
      // non-blocking
    } finally {
      setIsLoadingDeployments(false);
    }
  };

  const handleTriggerDeploy = async () => {
    if (!project?.id) return;
    setIsDeploying(true);
    try {
      const res = await deploymentsApi.submit(project.id, {
        branch: deployBranch || project.repositoryBranch || 'main',
        environment: project.defaultEnvironment || 'development',
      });
      setIsDeployModalOpen(false);
      onShowToast?.('success', 'Pipeline Dispatched', `Deployment #${res.deploymentId.substring(0, 8)} queued`);
      await loadDeployments(project.id);
    } catch (err: any) {
      onShowToast?.('error', 'Deploy Request Failed', err.message || 'Failed to submit deployment');
    } finally {
      setIsDeploying(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const latestDeployment = deployments[0];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        <span className="font-mono text-xs text-slate-400">Loading project workspace…</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-lg font-bold text-white">Project Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">The requested workspace does not exist or has been deleted.</p>
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 animate-fadeIn text-slate-200">
      {/* ── Breadcrumb & Top Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="hover:text-white transition-colors"
            >
              Projects
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-violet-400 font-semibold">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0 shadow-inner">
              <ProjectIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {project.name}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
              {project.defaultEnvironment || 'production'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-sans">
            {project.description || 'Continuous automation workspace with zero-downtime Kubernetes delivery.'}
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => project.id && loadDeployments(project.id)}
            className="h-10 px-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-all flex items-center gap-2"
            title="Refresh deployments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeployments ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 text-xs font-mono transition-all flex items-center gap-1.5"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsDeployModalOpen(true)}
            className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Deploy Branch</span>
          </button>
        </div>
      </div>

      {/* ── Two-Column Operational Workbench Layout ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Metadata & Architecture Blueprint (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Workspace Identity Box */}
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Workspace Identity
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Source Repository</span>
                <div className="flex items-center gap-1.5 mt-1 text-white font-semibold truncate">
                  <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="truncate">{project.repositoryUrl ? project.repositoryUrl.replace(/^https?:\/\/github\.com\//, '') : 'github.com/org/repo'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Active Branch</span>
                <span className="text-cyan-300 font-semibold mt-0.5 block">{project.repositoryBranch || 'main'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Cluster Namespace</span>
                <span className="text-slate-200 mt-0.5 block">{project.slug || project.name.toLowerCase()}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Provisioned Date</span>
                <span className="text-slate-400 mt-0.5 block">{formatDate(project.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Latest Active Deployment Status */}
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block">
              Active Environment State
            </span>

            {latestDeployment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-mono text-xs text-white font-bold">#{latestDeployment.id.substring(0, 8)}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    latestDeployment.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    latestDeployment.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {latestDeployment.status}
                  </span>
                </div>

                {latestDeployment.serviceUrl ? (
                  <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                      Live Ingress Endpoint
                    </span>
                    <a
                      href={latestDeployment.serviceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-white hover:text-emerald-300 font-bold underline decoration-emerald-500/40 flex items-center justify-between"
                    >
                      <span className="truncate">{latestDeployment.serviceUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-500">No public endpoint assigned yet</p>
                )}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-500">No previous deployment runs</p>
            )}
          </div>

          {/* EC2 Target Node Card */}
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                EC2 Target Node
              </span>
              {ec2Target && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ec2Target.healthStatus === 'ONLINE'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : ec2Target.healthStatus === 'UNVERIFIED'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {ec2Target.healthStatus}
                </span>
              )}
            </div>

            {ec2Target ? (
              <>
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-white/[0.04]">
                  <span>Host IP</span>
                  <span className="text-white font-bold">{ec2Target.publicIp}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-white/[0.04]">
                  <span>Port Mapping</span>
                  <span className="text-cyan-400 font-bold">{ec2Target.hostPort} → {ec2Target.containerPort}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-white/[0.04]">
                  <span>Dockerfile</span>
                  <span className="text-violet-300 truncate max-w-[160px]">{ec2Target.dockerfilePath}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleVerifyEc2}
                    disabled={isVerifyingEc2}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isVerifyingEc2 ? 'Probing SSH...' : 'Test SSH'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="Edit EC2 Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleViewRuntimeLogs}
                    disabled={isLoadingRuntime}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{isLoadingRuntime ? 'Loading...' : 'Logs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestartContainer}
                    disabled={isRestartingContainer}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRestartingContainer ? 'animate-spin' : ''}`} />
                    <span>{isRestartingContainer ? 'Restarting...' : 'Restart'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-500 text-[11px]">
                  No EC2 node attached yet. Configure an EC2 target to deploy via SSH.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="w-full px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure EC2 Target</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Workbench Tabs & Tables (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Workbench Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('deployments')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'deployments'
                  ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span>Deployments</span>
              <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                {deployments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('env')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'env'
                  ? 'bg-amber-600/30 text-white border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Env Vars</span>
              {envVars.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {envVars.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-cyan-600/30 text-white border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>EC2 Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('topology')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'topology'
                  ? 'bg-emerald-600/30 text-white border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cluster Topology</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manifest')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'manifest'
                  ? 'bg-sky-600/30 text-white border border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Manifest Spec</span>
            </button>
          </div>

          {/* TAB 1: Deployments Stream */}
          {activeTab === 'deployments' && (
            <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] overflow-hidden shadow-lg">
              {isLoadingDeployments ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 font-mono text-xs">
                  <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
                  <span>Loading deployment stream...</span>
                </div>
              ) : deployments.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-white text-sm">No deployment history</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
                    Execute your first build, test, and container rollout pipeline for this workspace.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Launch First Pipeline</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {deployments.map((dep) => (
                    <div
                      key={dep.id}
                      onClick={() => {
                        onSelectDeployment?.(dep);
                        onNavigate('deployment-details');
                      }}
                      className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white group-hover:text-violet-300 transition-colors">
                            #{dep.id.substring(0, 8)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            dep.status === 'SUCCEEDED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                            dep.status === 'FAILED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                            'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                          }`}>
                            {dep.status}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {formatDate(dep.startedAt || dep.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1 text-slate-300">
                            <GitBranch className="w-3 h-3 text-violet-400" />
                            <span>{dep.branch || 'main'}</span>
                          </span>
                          {dep.commitSha && (
                            <span className="text-slate-500">
                              commit {dep.commitSha.substring(0, 7)}
                            </span>
                          )}
                          <span className="text-slate-600">·</span>
                          <span className="text-emerald-400 capitalize">{dep.environment}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {dep.serviceUrl && (
                          <a
                            href={dep.serviceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Live App</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors text-xs">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manifest Blueprint */}
          {activeTab === 'manifest' && (
            <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs font-mono">
                <span className="text-slate-400 font-semibold">manifests/kubernetes/deployment.yaml</span>
                <span className="text-emerald-400 text-[11px]">SYNCHRONIZED</span>
              </div>
              <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto p-4 rounded-xl bg-black/40 border border-white/5">
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${project.slug || project.name.toLowerCase()}
  namespace: ${project.slug || project.name.toLowerCase()}
  labels:
    app.kubernetes.io/managed-by: iiap
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${project.slug || project.name.toLowerCase()}
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
      containers:
        - name: app
          image: ghcr.io/iiap/${project.slug || project.name.toLowerCase()}:latest
          ports:
            - containerPort: 3000
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { cpu: 500m, memory: 512Mi }`}
              </pre>
            </div>
          )}

          {/* TAB 3: Cluster Topology (BYOC AWS EKS) */}
          {activeTab === 'topology' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-400" />
                    <span>BYOC Cluster Runtime Target (AWS EKS)</span>
                  </h3>
                  {clusterTarget && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        clusterTarget.status === 'ONLINE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : clusterTarget.status === 'PROVISIONING'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : clusterTarget.status === 'UNVERIFIED'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {clusterTarget.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[11px]">Provisioner</span>
                    <p className="text-white font-bold">Terraform (`terraform/environments/dev`)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[11px]">Node Hardening</span>
                    <p className="text-cyan-300 font-bold">Ansible (`roles/common` + `roles/docker`)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[11px]">Orchestrator</span>
                    <p className="text-violet-300 font-bold">
                      {clusterTarget ? `AWS EKS (${clusterTarget.clusterName})` : 'AWS EKS (BYOC)'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[11px]">Manifests</span>
                    <p className="text-emerald-300 font-bold">manifests/kubernetes/</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h4 className="font-bold text-white text-sm">Configure Your AWS Account (BYOC)</h4>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Connect your AWS account via IAM Role ARN or Access Keys to provision EKS on your own cloud.
                    </p>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    AES-256-GCM
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClusterAuthMode('IAM_ROLE')}
                    className={`px-3 py-1.5 rounded-lg border ${
                      clusterAuthMode === 'IAM_ROLE'
                        ? 'bg-violet-500/20 border-violet-500/50 text-white'
                        : 'bg-black/30 border-white/10 text-slate-400'
                    }`}
                  >
                    IAM Role ARN (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClusterAuthMode('ACCESS_KEYS')}
                    className={`px-3 py-1.5 rounded-lg border ${
                      clusterAuthMode === 'ACCESS_KEYS'
                        ? 'bg-violet-500/20 border-violet-500/50 text-white'
                        : 'bg-black/30 border-white/10 text-slate-400'
                    }`}
                  >
                    AWS Access Keys
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clusterAuthMode === 'IAM_ROLE' ? (
                    <>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-bold block">AWS IAM Role ARN *</label>
                        <input
                          type="text"
                          value={clusterRoleArn}
                          onChange={(e) => setClusterRoleArn(e.target.value)}
                          placeholder="arn:aws:iam::123456789012:role/iiap-byoc-provisioner"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-bold block">External ID (Optional)</label>
                        <input
                          type="text"
                          value={clusterExternalId}
                          onChange={(e) => setClusterExternalId(e.target.value)}
                          placeholder="iiap-external-id"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-bold block">AWS Access Key ID *</label>
                        <input
                          type="text"
                          value={clusterAccessKeyId}
                          onChange={(e) => setClusterAccessKeyId(e.target.value)}
                          placeholder={clusterTarget?.accessKeyId || 'AKIA...'}
                          autoComplete="off"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-bold block">
                          AWS Secret Access Key{clusterTarget?.hasSecretKey ? ' (Optional to keep current)' : ' *'}
                        </label>
                        <input
                          type="password"
                          value={clusterSecretKey}
                          onChange={(e) => setClusterSecretKey(e.target.value)}
                          placeholder={clusterTarget?.hasSecretKey ? '•••••••• (stored)' : 'Secret Access Key'}
                          autoComplete="new-password"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 uppercase font-bold block">AWS Region</label>
                    <input
                      type="text"
                      value={clusterRegion}
                      onChange={(e) => setClusterRegion(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 uppercase font-bold block">EKS Cluster Name</label>
                    <input
                      type="text"
                      value={clusterName}
                      onChange={(e) => setClusterName(e.target.value)}
                      placeholder={`iiap-${project.slug || project.name.toLowerCase()}-eks`}
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 uppercase font-bold block">Node Instance Type</label>
                    <input
                      type="text"
                      value={clusterInstanceType}
                      onChange={(e) => setClusterInstanceType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 uppercase font-bold block">Desired Worker Nodes</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={clusterDesiredNodes}
                      onChange={(e) => setClusterDesiredNodes(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                  {clusterTarget && (
                    <>
                      {/* Remove Config only (keeps AWS resources) */}
                      <button
                        type="button"
                        disabled={isDeletingCluster || isSavingCluster || isVerifyingCluster || isDestroyingInfra}
                        onClick={handleDeleteClusterConfig}
                        className="h-10 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-2 disabled:opacity-50 mr-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{isDeletingCluster ? 'Removing...' : 'Remove Cluster Config'}</span>
                      </button>

                      {/* Destroy AWS infrastructure + config */}
                      <button
                        type="button"
                        disabled={isDeletingCluster || isSavingCluster || isVerifyingCluster || isDestroyingInfra}
                        onClick={() => setIsDestroyModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 text-orange-300 font-semibold flex items-center gap-2 disabled:opacity-50"
                        title="Runs terraform destroy — deletes ALL AWS resources (VPC, EKS, IAM Roles, etc.)"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>{isDestroyingInfra ? 'Destroying AWS…' : 'Destroy AWS Infrastructure'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isVerifyingCluster || isSavingCluster}
                      onClick={async () => {
                        if (!projectId) return;
                        setIsVerifyingCluster(true);
                        try {
                          const res = await awsClusterConfigApi.verifyCredentials(projectId);
                          setClusterTarget(res.target);
                          onShowToast?.('success', 'AWS Credentials Verified', `Cluster '${res.clusterName}' ready in ${res.awsRegion}`);
                        } catch (err: any) {
                          onShowToast?.('error', 'Verification Failed', err.message || 'Check your AWS credentials');
                        } finally {
                          setIsVerifyingCluster(false);
                        }
                      }}
                      className="h-10 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isVerifyingCluster ? 'Verifying...' : 'Verify AWS Credentials'}</span>
                    </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={isSavingCluster}
                    onClick={async () => {
                      if (!projectId) return;
                      setIsSavingCluster(true);
                      try {
                        const res = await awsClusterConfigApi.saveConfig(projectId, {
                          authMode: clusterAuthMode,
                          awsRegion: clusterRegion.trim() || 'us-east-1',
                          roleArn: clusterAuthMode === 'IAM_ROLE' ? clusterRoleArn.trim() : undefined,
                          externalId: clusterExternalId.trim() || undefined,
                          accessKeyId: clusterAuthMode === 'ACCESS_KEYS' ? clusterAccessKeyId.trim() : undefined,
                          secretAccessKey: clusterAuthMode === 'ACCESS_KEYS' && clusterSecretKey.trim() ? clusterSecretKey.trim() : undefined,
                          clusterName: clusterName.trim() || undefined,
                          nodeInstanceType: clusterInstanceType.trim() || 't3.medium',
                          desiredNodes: Number(clusterDesiredNodes) || 2,
                        });
                        setClusterTarget(res.target);
                        syncClusterForm(res.target);
                        onShowToast?.('success', 'BYOC Cluster Saved', `Configured EKS cluster '${res.target.clusterName}'`);
                      } catch (err: any) {
                        onShowToast?.('error', 'Save Failed', err.message || 'Could not save BYOC cluster config');
                      } finally {
                        setIsSavingCluster(false);
                      }
                    }}
                    className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingCluster ? 'Saving...' : 'Save BYOC Cluster Config'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Environment Variables Manager */}
          {activeTab === 'env' && (
            <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Environment Variables (AES-256-GCM Encrypted)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Variables are encrypted at rest and automatically injected into your container&apos;s <code className="text-amber-300">.env</code> on every deployment.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveEnvVar} autoComplete="off" className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Key
                  </label>
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                    placeholder="DATABASE_URL"
                    autoComplete="off"
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Value
                  </label>
                  <input
                    type="password"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newEnvSecret}
                      onChange={(e) => setNewEnvSecret(e.target.checked)}
                      className="rounded border-white/20 bg-black/50 text-amber-500"
                    />
                    <span>Secret</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isSavingEnv}
                    className="flex-1 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSavingEnv ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </form>

              <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                {isLoadingEnv ? (
                  <div className="p-6 text-center text-slate-400">Loading variables...</div>
                ) : envVars.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    No environment variables configured yet. Add your first variable above.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {envVars.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-amber-300 font-bold">{item.key}</span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-400 text-[10px]">
                            {item.is_secret ? 'ENCRYPTED SECRET' : 'CONFIG'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-[11px]">••••••••</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnvVar(item.key)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title={`Delete ${item.key}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EC2 Settings */}
          {activeTab === 'settings' && (
            <form
              onSubmit={handleSaveEc2Config}
              className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-6 shadow-lg space-y-5 font-mono text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>AWS EC2 Deployment Target (BYOS)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Update your EC2 host IP, SSH credentials, Dockerfile path, and container port mapping.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                  <span>AES-256-GCM Encrypted</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    EC2 Public IP / Hostname *
                  </label>
                  <input
                    type="text"
                    required
                    value={ec2PublicIp}
                    onChange={(e) => setEc2PublicIp(e.target.value)}
                    placeholder="e.g. 54.123.45.67"
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    AWS Region
                  </label>
                  <input
                    type="text"
                    value={ec2AwsRegion}
                    onChange={(e) => setEc2AwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    SSH Username
                  </label>
                  <input
                    type="text"
                    value={ec2SshUser}
                    onChange={(e) => setEc2SshUser(e.target.value)}
                    placeholder="ubuntu"
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    SSH Port
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={ec2SshPort}
                    onChange={(e) => setEc2SshPort(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Host Port (Public)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={ec2HostPort}
                    onChange={(e) => setEc2HostPort(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Container Port (App)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={ec2ContainerPort}
                    onChange={(e) => setEc2ContainerPort(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Dockerfile Path
                </label>
                <input
                  type="text"
                  value={ec2DockerfilePath}
                  onChange={(e) => setEc2DockerfilePath(e.target.value)}
                  placeholder="Dockerfile"
                  className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    SSH Private Key (.pem / OpenSSH){ec2Target?.hasSshKey ? ' — Optional (leave blank to keep current)' : ' *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEc2ShowKey((v) => !v)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {ec2ShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{ec2ShowKey ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={ec2SshKey}
                  onChange={(e) => setEc2SshKey(e.target.value)}
                  placeholder={
                    ec2Target?.hasSshKey
                      ? '•••••••••• (Encrypted key stored. Paste a new key only if you want to rotate it)'
                      : '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'
                  }
                  style={ec2ShowKey ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                {ec2Target && (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteEc2Config}
                      disabled={isDeletingEc2 || isSavingEc2 || isVerifyingEc2}
                      className="h-10 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 mr-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{isDeletingEc2 ? 'Removing...' : 'Remove EC2 Target'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyEc2}
                      disabled={isVerifyingEc2 || isSavingEc2}
                      className="h-10 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isVerifyingEc2 ? 'Testing SSH...' : 'Test SSH Connection'}</span>
                    </button>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSavingEc2}
                  className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.35)] flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEc2 ? 'Saving...' : 'Save EC2 Configuration'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Trigger Deployment Modal ──────────────────────────── */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-[#090A14] border border-white/[0.12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-violet-400 fill-current" />
                <span>Launch Pipeline Deployment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Workspace</span>
                <p className="text-white font-bold mt-0.5">{project.name}</p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Target Environment</span>
                <p className="text-emerald-400 font-bold mt-0.5 capitalize">{project.defaultEnvironment || 'production'}</p>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                  Target Git Branch
                </label>
                <input
                  type="text"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerDeploy}
                disabled={isDeploying}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Queueing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Run</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Runtime Container Logs Modal ──────────────────────── */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#090A14] border border-white/[0.12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 font-mono">
                <Terminal className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">
                  Runtime Logs {runtimeContainerName ? `• ${runtimeContainerName}` : ''}
                </h3>
                {runtimeStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      runtimeStatus.running
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {runtimeStatus.status.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewRuntimeLogs}
                  disabled={isLoadingRuntime}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-mono flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingRuntime ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="bg-black/70 border border-white/[0.06] rounded-xl p-4 h-96 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-0.5">
              {isLoadingRuntime ? (
                <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                  <span>Fetching container logs via SSH...</span>
                </div>
              ) : runtimeLogs.length === 0 ? (
                <div className="text-slate-500">No log lines returned.</div>
              ) : (
                runtimeLogs.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Project Confirmation Modal ─────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-[#090A14] border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Delete Project</h3>
                <p className="text-[11px] text-slate-400">This action permanently removes the project and its encrypted targets.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Are you sure you want to delete <span className="text-white font-bold">{project.name}</span>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProject ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Destroy AWS Infrastructure Confirmation Modal ──────── */}
      {isDestroyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#090A14] border border-orange-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Destroy AWS Infrastructure</h3>
                <p className="text-[11px] text-slate-400">This runs <code className="text-orange-300">terraform destroy</code> and deletes all AWS resources.</p>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs text-slate-300">
              <p>The following AWS resources will be <span className="text-orange-300 font-bold">permanently deleted</span>:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-2">
                <li>EKS Cluster &amp; Managed Node Group (EC2 instances)</li>
                <li>VPC, Subnets, NAT Gateway, Internet Gateway</li>
                <li>IAM Roles &amp; Policy Attachments</li>
                <li>OIDC Provider (IRSA)</li>
                <li>AWS Load Balancer (ELB)</li>
                <li>ECR Repository &amp; Docker images</li>
              </ul>
              <p className="text-orange-200 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 mt-2">
                ⚠️ This can take <strong>10–20 minutes</strong> and cannot be undone. The cluster config will also be removed from this project.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDestroyModalOpen(false)}
                disabled={isDestroyingInfra}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDestroyInfrastructure}
                disabled={isDestroyingInfra}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{isDestroyingInfra ? 'Destroying…' : 'Yes, Destroy Everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsPage;
