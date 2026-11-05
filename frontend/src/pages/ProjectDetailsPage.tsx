import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Play,
  Terminal,
  Layers,
  Clock,
  ChevronRight,
  ShieldCheck,
  Settings,
  RefreshCw,
  GitCommit,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { PageId } from '../types';
import { projectsApi, deploymentsApi, Project, ApiDeployment } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'deployments' | 'config' | 'settings'>('deployments');
  const [isLoading, setIsLoading] = useState<boolean>(!initialProject);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [deployBranch, setDeployBranch] = useState<string>('main');

  const projectId = initialProject?.id;

  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
      loadDeployments(projectId);
    } else {
      setIsLoading(false);
      setIsLoadingDeployments(false);
    }
  }, [projectId]);

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
      // Non-blocking for page view
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
      onShowToast?.('success', 'Pipeline Triggered', `Deployment #${res.deploymentId.substring(0, 8)} queued!`);
      await loadDeployments(project.id);
    } catch (err: any) {
      onShowToast?.('error', 'Deploy Request Failed', err.message || 'Failed to submit deployment');
    } finally {
      setIsDeploying(false);
    }
  };

  const renderStatusBadge = (status: string | undefined | null) => {
    switch ((status || '').toUpperCase()) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </span>
        );
      case 'QUEUED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Queued</span>
          </span>
        );
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-sm text-[#A1A1B5]">Loading project overview…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Project not selected</h2>
        <p className="text-sm text-[#A1A1B5] mb-6">Please select a project from the catalog.</p>
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to projects</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#A1A1B5] capitalize">
              {project.defaultEnvironment}
            </span>
            {renderStatusBadge(project.setupStatus)}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#A1A1B5] font-mono">
            <GitBranch className="w-3.5 h-3.5 text-violet-400" />
            <span>
              Branch: <code className="text-white">{project.repositoryBranch || 'main'}</code>
            </span>
            <span>·</span>
            <span className="truncate max-w-sm">
              {project.githubRepoFullName || project.repositoryUrl || 'Configured Git Repo'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('deployments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
            <span>Deployments</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeployModalOpen(true)}
            disabled={isDeploying}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isDeploying ? 'animate-spin' : ''}`} />
            <span>{isDeploying ? 'Triggering...' : 'Deploy Now'}</span>
          </button>
        </div>
      </div>

      {/* 3 Telemetry Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 z-10">
        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-lg">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
            Target Environment
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-white capitalize">{project.defaultEnvironment}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1">Automatic container ingress enabled</p>
        </div>

        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-lg">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
            Total Deployments
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{deployments.length}</span>
            <span className="text-xs text-[#A1A1B5]">pipeline runs</span>
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Latest: {project.latestDeployment ? renderStatusBadge(project.latestDeployment.status) : 'None'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-lg">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
            Repository Setup
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{project.setupStatus}</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1 truncate">
            {project.githubRepoFullName || 'Linked via platform'}
          </p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 flex items-center gap-6 z-10 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('deployments')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'deployments'
              ? 'border-violet-500 text-white font-semibold'
              : 'border-transparent text-[#A1A1B5] hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Deployment History ({deployments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-violet-500 text-white font-semibold'
              : 'border-transparent text-[#A1A1B5] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configuration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-violet-500 text-white font-semibold'
              : 'border-transparent text-[#A1A1B5] hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Project Settings</span>
        </button>
      </div>

      {/* TAB 1: Deployments History */}
      {activeTab === 'deployments' && (
        <div className="rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 overflow-hidden z-10 shadow-xl">
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Pipeline Executions</h3>
            <button
              type="button"
              onClick={() => loadDeployments(project.id)}
              disabled={isLoadingDeployments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs text-[#A1A1B5] hover:text-white border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingDeployments ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingDeployments && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#A1A1B5]">
              <RefreshCw className="w-6 h-6 animate-spin text-violet-400" />
              <p className="text-xs">Loading execution history…</p>
            </div>
          )}

          {!isLoadingDeployments && deployments.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center p-6">
              <Clock className="w-10 h-10 text-[#A1A1B5] mb-2" />
              <p className="text-sm font-semibold text-white">No deployments triggered yet</p>
              <p className="text-xs text-[#A1A1B5] mb-4">
                Launch your first pipeline build to view execution milestones and live logs.
              </p>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md"
              >
                Trigger Deployment
              </button>
            </div>
          )}

          {!isLoadingDeployments && deployments.length > 0 && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                    <th className="py-3 px-4">Deployment ID</th>
                    <th className="py-3 px-4">Branch / Commit</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {deployments.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => {
                        if (onSelectDeployment) onSelectDeployment(d);
                        onNavigate('deployment-details');
                      }}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {d.id.substring(0, 8)}…
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#A1A1B5]">
                        <div className="flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span>{d.branch || 'main'}</span>
                          {d.commitSha && (
                            <span className="text-violet-300 text-[11px]">
                              ({d.commitSha.substring(0, 7)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5 capitalize">
                          {d.environment}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{renderStatusBadge(d.status)}</td>
                      <td className="py-3.5 px-4 text-[#A1A1B5]">{formatDate(d.startedAt || d.createdAt)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-[#A1A1B5] group-hover:text-violet-300 transition-all inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Configuration */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
          <div className="rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Build & Container Spec</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Default Branch</p>
                <p className="text-white font-mono mt-0.5">{project.repositoryBranch || 'main'}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Default Environment</p>
                <p className="text-emerald-400 font-mono mt-0.5 capitalize">{project.defaultEnvironment}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">GitHub Full Name</p>
                <p className="text-violet-300 font-mono mt-0.5">{project.githubRepoFullName || '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Repository Link</h3>
            <p className="text-xs text-[#A1A1B5]">
              Source repository linked for continuous delivery container builds.
            </p>
            {project.repositoryUrl ? (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <p className="text-xs text-[#A1A1B5] font-mono">No external URL provided</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Settings */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 space-y-4 z-10 max-w-2xl">
          <h3 className="text-sm font-bold text-white">Project Identity & Metadata</h3>
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Project UUID</p>
              <code className="text-violet-300 font-mono text-xs select-all">{project.id}</code>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Project Slug</p>
              <code className="text-white font-mono text-xs">{project.slug}</code>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Created At</p>
              <p className="text-[#A1A1B5]">{formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Deployment Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-[#13131F] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Trigger Pipeline Deployment</h3>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                  Project Name
                </label>
                <p className="text-white font-semibold mt-1">{project.name}</p>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                  Target Environment
                </label>
                <p className="text-emerald-400 font-mono mt-1 capitalize">{project.defaultEnvironment}</p>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                  Git Branch
                </label>
                <input
                  type="text"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-black/50 border border-white/15 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#A1A1B5] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerDeploy}
                disabled={isDeploying}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:brightness-110 disabled:opacity-50"
              >
                {isDeploying ? 'Deploying...' : 'Confirm & Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsPage;
