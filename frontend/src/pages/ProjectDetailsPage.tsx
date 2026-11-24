import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Play,
  Layers,
  ChevronRight,
  Settings,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Box,
  Cpu,
  Plus,
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-white/5 border border-white/10 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
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
        <p className="text-sm font-mono text-slate-400">Loading project topology…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Project not found</h2>
        <p className="text-sm text-slate-400 mb-6">The requested repository project does not exist or has been removed.</p>
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-fadeIn">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-violet-600/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-48 right-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[130px] pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-2.5 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Projects</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {project.name}
            </h1>
            <span className="font-mono text-xs text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10">
              {project.repositoryBranch || 'main'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-sans">
            {project.description || 'Automated deployment workspace managed by IIAP control plane.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (project.id) loadDeployments(project.id);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-all"
            title="Refresh deployments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeployments ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeployModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-[0_0_24px_rgba(124,58,237,0.45)] hover:shadow-[0_0_32px_rgba(124,58,237,0.65)] transition-all active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Deploy Branch</span>
          </button>
        </div>
      </div>

      {/* Quick Spec Metrics Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Repository</span>
          <div className="flex items-center gap-2 mt-2 font-mono text-sm text-white truncate">
            <GitBranch className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="truncate">{project.repositoryUrl ? project.repositoryUrl.replace(/^https?:\/\/github\.com\//, '') : 'Local Git'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Default Target</span>
          <div className="flex items-center gap-2 mt-2 font-mono text-sm text-emerald-400 capitalize">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{project.defaultEnvironment || 'production'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Cluster Architecture</span>
          <div className="flex items-center gap-2 mt-2 font-mono text-sm text-sky-400">
            <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Kubernetes Native</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Deployments</span>
          <div className="flex items-center gap-2 mt-2 font-mono text-sm text-white font-bold">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{deployments.length} Runs</span>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 z-10 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('deployments')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'deployments'
              ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.3)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          <span>Deployment History</span>
          <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px]">
            {deployments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.3)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-sky-400" />
          <span>Infrastructure Manifests</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.3)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>

      {/* TAB 1: Deployments History */}
      {activeTab === 'deployments' && (
        <div className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-white/[0.08] overflow-hidden z-10 shadow-xl">
          {isLoadingDeployments ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="font-mono text-xs">Loading execution history...</p>
            </div>
          ) : deployments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-medium text-white">No deployments yet</p>
              <p className="text-xs max-w-sm mx-auto font-sans">
                Trigger your first automated build and deployment from Git commit to Kubernetes cluster.
              </p>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Trigger Deployment</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                    <th className="py-3 px-4 font-semibold">Deployment ID</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Branch & Commit</th>
                    <th className="py-3 px-4 font-semibold">Environment</th>
                    <th className="py-3 px-4 font-semibold">Live Service</th>
                    <th className="py-3 px-4 font-semibold">Triggered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {deployments.map((dep) => (
                    <tr
                      key={dep.id}
                      onClick={() => {
                        onSelectDeployment?.(dep);
                        onNavigate('deployment-details');
                      }}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-white group-hover:text-violet-300 transition-colors">
                        #{dep.id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4">{renderStatusBadge(dep.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <GitBranch className="w-3 h-3 text-violet-400" />
                          <span>{dep.branch || 'main'}</span>
                          {dep.commitSha && (
                            <span className="text-slate-500 text-[11px]">
                              ({dep.commitSha.substring(0, 7)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-emerald-400 font-semibold">{dep.environment}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {dep.serviceUrl ? (
                          <a
                            href={dep.serviceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold"
                          >
                            <span>Open URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(dep.startedAt || dep.createdAt)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Config */}
      {activeTab === 'config' && (
        <div className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-white/[0.08] p-6 space-y-4 z-10">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold text-white">Infrastructure as Code Blueprint</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Declarative Terraform and Kubernetes spec applied during deployment runs.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              HERMETIC SPEC
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
              <span className="text-slate-400">Kubernetes Cluster Namespace:</span>
              <span className="text-white font-bold">{project.slug || project.name.toLowerCase()}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
              <span className="text-slate-400">Ingress Strategy:</span>
              <span className="text-cyan-400 font-bold">Deterministic NodePort Pool (30000 - 32767)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
              <span className="text-slate-400">Container Registry:</span>
              <span className="text-violet-400 font-bold">ghcr.io / OCI Hermetic BuildKit</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
              <span className="text-slate-400">Zero-Trust Baseline:</span>
              <span className="text-emerald-400 font-bold">runAsNonRoot: true · Drop All Capabilities</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Settings */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-white/[0.08] p-6 space-y-4 z-10 max-w-2xl">
          <h3 className="text-base font-bold text-white">Project Identity & Metadata</h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Project UUID</p>
              <code className="text-violet-300 font-semibold select-all mt-1 block">{project.id}</code>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Project Slug</p>
              <code className="text-white font-semibold mt-1 block">{project.slug}</code>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Provisioned Date</p>
              <p className="text-slate-300 mt-1">{formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Deployment Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#090A14] border border-white/[0.12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-violet-400 fill-current" />
                <span>Trigger Pipeline Deployment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 font-mono text-xs">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-400">
                  Target Project
                </label>
                <p className="text-white font-bold mt-1">{project.name}</p>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-400">
                  Environment
                </label>
                <p className="text-emerald-400 font-bold mt-1 capitalize">{project.defaultEnvironment}</p>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-400">
                  Git Branch
                </label>
                <input
                  type="text"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="w-full h-10 px-3.5 mt-1 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
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
    </div>
  );
};

export default ProjectDetailsPage;
