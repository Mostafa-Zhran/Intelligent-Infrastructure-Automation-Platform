import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  RefreshCw,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Terminal,
  Search,
  CheckCircle2,
  GitCommit,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { PageId, UserProfile } from '../types';
import {
  dashboardApi,
  DashboardMetrics,
  DashboardRecentDeployment,
  Project,
} from '../services/api';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onSelectProject?: (project: any) => void;
  onSelectDeployment?: (deployment: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onNavigate,
  onSelectProject,
  onSelectDeployment,
  onShowToast,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    runningDeployments: 0,
    failedDeployments: 0,
    succeededDeployments: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentDeployments, setRecentDeployments] = useState<DashboardRecentDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [deploymentFilter, setDeploymentFilter] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await dashboardApi.getSummary();
      setMetrics(data.metrics);
      setProjects(data.projects || []);
      setRecentDeployments(data.recentDeployments || []);
      setLastUpdated(
        new Date().toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err: any) {
      onShowToast?.('error', 'Dashboard Sync Failed', err.message || 'Could not load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(true);
    onShowToast?.('info', 'Telemetry Synced', 'Live pipeline metrics and projects refreshed.');
  };

  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.githubRepoFullName || '').toLowerCase().includes(q) ||
      (p.repositoryUrl || '').toLowerCase().includes(q)
    );
  });

  const filteredDeployments = recentDeployments.filter((d) => {
    if (deploymentFilter === 'ALL') return true;
    return d.status.toUpperCase() === deploymentFilter.toUpperCase();
  });

  const renderStatusBadge = (status: string | undefined | null) => {
    switch ((status || '').toUpperCase()) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/15 border border-sky-500/30 text-sky-300 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Queued</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Console Overview</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-[#A1A1B5] border border-white/10">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Operational</span>
            </span>
          </div>
          <p className="text-sm text-[#A1A1B5]">
            Welcome back, <span className="text-white font-medium">{user.fullName || "Developer"}</span>. Real-time infrastructure status and active pipeline delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-[#A1A1B5] hidden sm:inline-block">
            Updated: <span className="text-white font-mono">{lastUpdated}</span>
          </span>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            title="Sync latest telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A1A1B5] ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_4px_28px_0_rgba(139,92,246,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Strip (Operate mode: high contrast, glanceable) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 z-10">
        {/* Metric 1: Total Projects */}
        <div
          onClick={() => onNavigate('projects')}
          className="relative overflow-hidden rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)] group hover:border-violet-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Total Projects
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300 group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? '…' : metrics.totalProjects}
            </span>
            <span className="text-xs text-[#A1A1B5]">tracked repos</span>
          </div>
        </div>

        {/* Metric 2: Active Pipelines */}
        <div
          onClick={() => onNavigate('deployments')}
          className="relative overflow-hidden rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)] group hover:border-sky-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Running Pipelines
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <RefreshCw className={`w-4 h-4 ${metrics.runningDeployments > 0 ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? '…' : metrics.runningDeployments}
            </span>
            {metrics.runningDeployments > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Active build
              </span>
            ) : (
              <span className="text-xs text-[#A1A1B5]">idle</span>
            )}
          </div>
        </div>

        {/* Metric 3: Succeeded */}
        <div
          onClick={() => onNavigate('deployments')}
          className="relative overflow-hidden rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)] group hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Succeeded
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">
              {isLoading ? '…' : metrics.succeededDeployments}
            </span>
            <span className="text-xs text-[#A1A1B5]">healthy deploys</span>
          </div>
        </div>

        {/* Metric 4: Failed */}
        <div
          onClick={() => onNavigate('deployments')}
          className="relative overflow-hidden rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)] group hover:border-rose-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Failed (Needs review)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400 tracking-tight">
              {isLoading ? '…' : metrics.failedDeployments}
            </span>
            {metrics.failedDeployments > 0 ? (
              <span className="text-[11px] font-medium text-rose-300">action required</span>
            ) : (
              <span className="text-xs text-[#A1A1B5]">all clear</span>
            )}
          </div>
        </div>
      </section>

      {/* Middle Section: Active Projects Grid */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl p-6 sm:p-7 border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)] z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-white/5 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Active Projects</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-[#A1A1B5] font-mono">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-44 sm:w-56 h-8 pl-8 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-white transition-colors"
            >
              <span>View all projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs text-[#A1A1B5]">Syncing project catalog…</p>
          </div>
        )}

        {/* Zero state */}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5] mb-3">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No registered projects yet</p>
            <p className="text-xs text-[#A1A1B5] mb-5 max-w-xs">
              Connect a Git repository to provision containers and automated CI/CD pipelines.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-project')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        )}

        {/* Projects Cards Grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.slice(0, 6).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  if (onSelectProject) onSelectProject(p);
                  onNavigate('project-details');
                }}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#0F0F19]/90 hover:bg-[#161626] border border-white/10 hover:border-violet-500/40 transition-all duration-200 cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_28px_-6px_rgba(139,92,246,0.2)]"
              >
                <div className="flex flex-col gap-1.5 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                      {p.name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[#A1A1B5] group-hover:text-violet-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>
                  <span className="font-mono text-[11px] text-[#A1A1B5] truncate">
                    {p.githubRepoFullName || p.repositoryUrl || 'Direct container repository'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5 capitalize">
                    {p.defaultEnvironment}
                  </span>
                  {p.latestDeployment
                    ? renderStatusBadge(p.latestDeployment.status)
                    : renderStatusBadge(p.setupStatus)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Section: Recent Pipeline Deployments */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl p-6 sm:p-7 border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)] z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-4 border-b border-white/5 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Pipeline Runs</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-[#A1A1B5] font-mono">
              {filteredDeployments.length} runs
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setDeploymentFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  deploymentFilter === st
                    ? 'bg-violet-600/30 text-white border border-violet-500/40 font-semibold'
                    : 'bg-white/[0.03] text-[#A1A1B5] hover:text-white border border-transparent'
                }`}
              >
                {st}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onNavigate('deployments')}
              className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-white transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Deployments Table */}
        <div className="overflow-x-auto w-full -mx-2 sm:mx-0">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                <th className="py-3 px-4 rounded-l-xl">Deployment</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Branch / Commit</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#A1A1B5]">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading deployment history…
                  </td>
                </tr>
              ) : filteredDeployments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#A1A1B5] text-xs">
                    {deploymentFilter !== 'ALL'
                      ? `No deployments with status "${deploymentFilter}".`
                      : 'No deployment pipelines triggered yet.'}
                  </td>
                </tr>
              ) : (
                filteredDeployments.map((d) => (
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
                    <td className="py-3.5 px-4">
                      <span className="text-white group-hover:text-violet-300 font-medium transition-colors flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
                        <span>{d.projectName}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#A1A1B5]">
                      <div className="flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span>{d.branch}</span>
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
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(d.status)}
                    </td>
                    <td className="py-3.5 px-4 text-[#A1A1B5]">
                      {formatRelativeTime(d.startedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-[#A1A1B5] group-hover:text-violet-300 transition-all inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
