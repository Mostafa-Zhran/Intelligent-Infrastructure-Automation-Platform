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
} from 'lucide-react';
import { PageId } from '../types';
import { projectsApi, deploymentsApi, Project, ApiDeployment } from '../services/api';
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
  const [activeTab, setActiveTab] = useState<'deployments' | 'manifest' | 'topology' | 'settings'>('deployments');
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

          {/* Zero-Trust Compliance Blueprint */}
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-2.5 font-mono text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Enforced Security Profile
            </span>
            <div className="flex items-center justify-between text-slate-400 py-1 border-b border-white/[0.04]">
              <span>K8s ServiceAccount</span>
              <span className="text-emerald-400 font-bold">Non-Root (10001)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 py-1 border-b border-white/[0.04]">
              <span>Linux Capabilities</span>
              <span className="text-emerald-400 font-bold">ALL DROPPED</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 py-1">
              <span>Ingress Port Mesh</span>
              <span className="text-cyan-400 font-bold">Deterministic NodePort</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Workbench Tabs & Tables (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Workbench Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 font-mono text-xs">
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
              onClick={() => setActiveTab('manifest')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'manifest'
                  ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Manifest Spec</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('topology')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'topology'
                  ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cluster Topology</span>
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

          {/* TAB 3: Cluster Topology */}
          {activeTab === 'topology' && (
            <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4 font-mono text-xs">
              <h3 className="font-bold text-white text-sm">Cluster Runtime Target</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[11px]">Orchestrator</span>
                  <p className="text-white font-bold">K3s Lightweight Engine</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[11px]">Ingress Controller</span>
                  <p className="text-cyan-300 font-bold">Traefik Ingress Route</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[11px]">State Backend</span>
                  <p className="text-violet-300 font-bold">Encrypted S3 State Locks</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[11px]">Container Engine</span>
                  <p className="text-emerald-300 font-bold">Containerd 1.7 / OCI</p>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default ProjectDetailsPage;
