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
    onShowToast?.('info', 'Telemetry Synced', 'Live pipeline metrics and infrastructure state updated.');
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono">
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
    <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-fadeIn">
      {/* ── 1. Top Executive Control Header ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Engineering Console
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mesh Active</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Authenticated as <span className="text-slate-200 font-medium">{user.fullName || 'Operator'}</span> ({user.email}) · Live Kubernetes & CI/CD topology control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-mono text-slate-500 hidden lg:inline-block mr-1">
            Synced: <span className="text-slate-300">{lastUpdated}</span>
          </span>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors disabled:opacity-50"
            title="Refresh metrics and pipelines"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy Project</span>
          </button>
        </div>
      </div>

      {/* ── 2. Primary Telemetry Tiles (Operate Mode: High Contrast & Dense) ─ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Total Projects */}
        <div
          onClick={() => onNavigate('projects')}
          className="p-4 sm:p-5 rounded-2xl bg-[#0C0C16] border border-white/10 hover:border-violet-500/30 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Projects</span>
            <FolderGit2 className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight tabular-nums">
              {isLoading ? '…' : metrics.totalProjects}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">active repos</span>
          </div>
        </div>

        {/* Metric 2: Active Deployments */}
        <div
          onClick={() => {
            setDeploymentFilter('RUNNING');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-[#0C0C16] border transition-all cursor-pointer flex flex-col justify-between group ${
            metrics.runningDeployments > 0 ? 'border-sky-500/40' : 'border-white/10 hover:border-sky-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Rollouts</span>
            <RefreshCw className={`w-4 h-4 text-sky-400 ${metrics.runningDeployments > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-400 font-mono tracking-tight tabular-nums">
              {isLoading ? '…' : metrics.runningDeployments}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {metrics.runningDeployments > 0 ? 'building now' : 'idle state'}
            </span>
          </div>
        </div>

        {/* Metric 3: Succeeded */}
        <div
          onClick={() => {
            setDeploymentFilter('SUCCEEDED');
          }}
          className="p-4 sm:p-5 rounded-2xl bg-[#0C0C16] border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Succeeded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight tabular-nums">
              {isLoading ? '…' : metrics.succeededDeployments}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">live workloads</span>
          </div>
        </div>

        {/* Metric 4: Failed */}
        <div
          onClick={() => {
            setDeploymentFilter('FAILED');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-[#0C0C16] border transition-all cursor-pointer flex flex-col justify-between group ${
            metrics.failedDeployments > 0 ? 'border-rose-500/40' : 'border-white/10 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Failed</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.failedDeployments > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono tracking-tight tabular-nums ${metrics.failedDeployments > 0 ? 'text-rose-400' : 'text-white'}`}>
              {isLoading ? '…' : metrics.failedDeployments}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {metrics.failedDeployments > 0 ? 'needs triage' : '0 errors'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Active Projects Section ───────────────────────────────────── */}
      <section className="rounded-2xl bg-[#0A0A14] border border-white/10 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white tracking-tight">Active Repositories</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-400 font-mono tabular-nums">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-48 sm:w-64 h-8 pl-8 pr-3 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-white transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-2.5">
            <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Syncing repositories from database…</p>
          </div>
        )}

        {/* Zero state */}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 mb-3">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No repositories configured</p>
            <p className="text-xs text-slate-400 mb-5 max-w-xs">
              Connect a Git repository to start automated container builds and live Kubernetes rollouts.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-project')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy First Project</span>
            </button>
          </div>
        )}

        {/* Projects Cards Grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredProjects.slice(0, 6).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  if (onSelectProject) onSelectProject(p);
                  onNavigate('project-details');
                }}
                className="group flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-[#0E0E1B] hover:bg-[#131326] border border-white/10 hover:border-violet-500/40 transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                      {p.name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-colors shrink-0" />
                  </div>
                  <p className="font-mono text-xs text-slate-400 truncate">
                    {p.githubRepoFullName || p.repositoryUrl || 'Container project'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/5 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] bg-white/[0.04] text-slate-400 border border-white/5 capitalize">
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

      {/* ── 4. Recent Pipeline Deployments Table ─────────────────────────── */}
      <section className="rounded-2xl bg-[#0A0A14] border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white tracking-tight">Recent Deployments</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-400 font-mono tabular-nums">
              {filteredDeployments.length} runs
            </span>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setDeploymentFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  deploymentFilter === st
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
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
              <span>View all runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Deployments Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/5">
                <th className="py-3 px-4">Deployment ID</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Branch / Commit</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2 text-violet-400" />
                    Loading deployment history…
                  </td>
                </tr>
              ) : filteredDeployments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-mono text-xs">
                    {deploymentFilter !== 'ALL'
                      ? `No deployments with status "${deploymentFilter}".`
                      : 'No deployment pipelines executed yet.'}
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
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {d.id.substring(0, 8)}…
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-white group-hover:text-violet-300 font-medium transition-colors flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.projectName}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] bg-white/[0.04] text-slate-400 border border-white/5 capitalize">
                        {d.environment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(d.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {formatRelativeTime(d.startedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-colors inline-block" />
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
