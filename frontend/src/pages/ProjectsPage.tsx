import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Layers,
  LayoutGrid,
  List,
  GitBranch,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { PageId } from '../types';
import { projectsApi, Project } from '../services/api';

interface ProjectsPageProps {
  onNavigate: (page: PageId) => void;
  onSelectProject?: (project: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onNavigate,
  onSelectProject,
  onShowToast,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const { projects: list } = await projectsApi.list();
      setProjects(list || []);
    } catch (err: any) {
      onShowToast?.('error', 'Sync Failed', err.message || 'Failed to fetch workloads catalog');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.githubRepoFullName || '').toLowerCase().includes(q) ||
        (p.repositoryUrl || '').toLowerCase().includes(q);
      const matchEnv = envFilter === 'ALL' || p.defaultEnvironment.toLowerCase() === envFilter.toLowerCase();
      return matchSearch && matchEnv;
    });
  }, [projects, searchQuery, envFilter]);

  // Compute operational statistics
  const totalProjects = projects.length;
  const prodProjects = projects.filter((p) => p.defaultEnvironment.toLowerCase() === 'production').length;
  const healthyProjects = projects.filter(
    (p) =>
      (p.latestDeployment?.status || '').toUpperCase() === 'SUCCEEDED' ||
      (p.setupStatus || '').toUpperCase() === 'READY'
  ).length;

  const handleRowClick = (project: Project) => {
    if (onSelectProject) {
      onSelectProject(project);
    }
    onNavigate('project-details');
  };

  const renderStatusBadge = (status: string | undefined | null) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Queued</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#07080E] text-slate-100 flex flex-col">
      {/* ── Top Command Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#090A12]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Workload Services Catalog
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  {totalProjects} Workloads Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated continuous delivery pipelines and container orchestration endpoints.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono">
              <span className="text-slate-400">
                Healthy: <span className="text-emerald-400 font-bold">{healthyProjects}/{totalProjects}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Production: <span className="text-violet-300 font-bold">{prodProjects}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchProjects(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('new-project')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy New Workload</span>
            </button>
          </div>
        </div>

        {/* Filters and View Switcher Subheader */}
        <div className="max-w-7xl mx-auto mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex items-center min-w-[220px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search workloads by name, repository, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 font-mono transition-colors"
              />
            </div>

            {/* Environment Chips */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
              {(['ALL', 'production', 'staging', 'development'] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvFilter(env)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition-colors ${
                    envFilter === env
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Presentation Switcher: Grid vs Table */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Matrix Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Catalog Workspace ─────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs font-mono text-slate-400">Loading workload catalog from cluster registry…</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="rounded-2xl bg-[#0C0D17] border border-white/[0.08] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {projects.length === 0 ? 'No Workloads Configured' : 'No Matching Workloads'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {projects.length === 0
                ? 'Connect a Git repository to provision autonomous container builds, NodePort endpoints, and live K8s deployments.'
                : 'No workloads match the selected environment filter or search query.'}
            </p>
            {projects.length === 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('new-project')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deploy First Workload</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setEnvFilter('ALL');
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:text-white"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* ── 1. Grid View ─────────────────────────────────────────────── */}
        {!isLoading && filteredProjects.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleRowClick(p)}
                className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] hover:border-violet-500/40 hover:bg-[#10121F] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                        {p.name}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-colors shrink-0" />
                  </div>

                  <p className="font-mono text-xs text-slate-400 truncate mb-4">
                    {p.githubRepoFullName || p.repositoryUrl || 'Autonomous Container Workload'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/5 text-slate-300 capitalize">
                      Env: {p.defaultEnvironment}
                    </span>
                    {p.repositoryBranch && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1">
                        <GitBranch className="w-2.5 h-2.5" />
                        {p.repositoryBranch}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                  {p.latestDeployment
                    ? renderStatusBadge(p.latestDeployment.status)
                    : renderStatusBadge(p.setupStatus)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 2. Table Matrix View ──────────────────────────────────────── */}
        {!isLoading && filteredProjects.length > 0 && viewMode === 'table' && (
          <div className="rounded-2xl bg-[#0C0D17] border border-white/[0.08] overflow-hidden animate-fadeIn">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse min-w-[780px]">
                <thead>
                  <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
                    <th className="py-3 px-4">Workload Service</th>
                    <th className="py-3 px-4">Repository Origin</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Target Branch</th>
                    <th className="py-3 px-4">Latest Pipeline</th>
                    <th className="py-3 px-4">Provisioned</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
                  {filteredProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Terminal className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span className="font-bold text-white group-hover:text-violet-300 transition-colors">
                            {p.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 truncate max-w-[220px]">
                        {p.githubRepoFullName || p.repositoryUrl || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-white/[0.04] text-slate-300 border border-white/5 capitalize">
                          {p.defaultEnvironment}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-violet-400" />
                          {p.repositoryBranch || 'main'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.latestDeployment
                          ? renderStatusBadge(p.latestDeployment.status)
                          : renderStatusBadge(p.setupStatus)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-colors inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectsPage;
