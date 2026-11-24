import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Terminal,
  RefreshCw,
  GitBranch,
  Plus,
  ExternalLink,
  Clock,
  Zap,
} from 'lucide-react';
import { PageId } from '../types';
import { deploymentsApi, ApiDeployment } from '../services/api';

interface DeploymentsPageProps {
  onNavigate: (page: PageId) => void;
  onSelectDeployment?: (deployment: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DeploymentsPage: React.FC<DeploymentsPageProps> = ({
  onNavigate,
  onSelectDeployment,
  onShowToast,
}) => {
  const [deployments, setDeployments] = useState<ApiDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(15);

  useEffect(() => {
    fetchDeployments();
  }, [statusFilter]);

  // Polling interval
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const timer = setInterval(() => {
      fetchDeployments(true);
    }, autoRefreshSec * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshSec, statusFilter]);

  const fetchDeployments = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await deploymentsApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setDeployments(data.deployments || []);
    } catch (err: any) {
      onShowToast?.('error', 'Fetch Failed', err.message || 'Failed to fetch deployments history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return deployments.filter((d) => {
      const projectName = d.project?.name?.toLowerCase() || '';
      const id = d.id.toLowerCase();
      const branch = d.branch?.toLowerCase() || '';
      const commit = d.commitSha?.toLowerCase() || '';
      const author = d.createdBy?.name?.toLowerCase() || d.createdBy?.email?.toLowerCase() || '';
      const matchQuery =
        projectName.includes(query) ||
        id.includes(query) ||
        branch.includes(query) ||
        commit.includes(query) ||
        author.includes(query);
      const matchEnv = envFilter === 'ALL' || d.environment.toLowerCase() === envFilter.toLowerCase();
      return matchQuery && matchEnv;
    });
  }, [deployments, searchQuery, envFilter]);

  // Telemetry KPIs
  const totalRuns = deployments.length;
  const runningRuns = deployments.filter((d) => d.status.toUpperCase() === 'RUNNING').length;
  const succeededRuns = deployments.filter((d) => d.status.toUpperCase() === 'SUCCEEDED').length;
  const failedRuns = deployments.filter((d) => d.status.toUpperCase() === 'FAILED').length;
  const successPercentage = totalRuns > 0 ? Math.round((succeededRuns / totalRuns) * 100) : 100;

  const handleRowClick = (deployment: ApiDeployment) => {
    if (onSelectDeployment) {
      onSelectDeployment(deployment);
    }
    onNavigate('deployment-details');
  };

  const renderStatusBadge = (status: string) => {
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
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Pending</span>
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

  return (
    <div className="relative w-full min-h-screen bg-[#07080E] text-slate-100 flex flex-col">
      {/* ── Top Status Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#090A12]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Continuous Delivery Rollouts
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Pipeline Runner Ready</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-stage orchestration: Container build, Security scan, Ansible hardening, and K8s NodePort rollout.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Auto-Sync Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-1 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 ml-1 text-slate-500" />
              <span>Poll:</span>
              {[15, 30, 0].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setAutoRefreshSec(sec)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    autoRefreshSec === sec
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchDeployments(true)}
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
              <span>Trigger Deployment</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Strip */}
        <div className="max-w-7xl mx-auto mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/[0.06] text-xs font-mono">
          <div className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400">Total Runs:</span>
            <span className="text-white font-bold tabular-nums">{totalRuns}</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400">Active In-Flight:</span>
            <span className={`font-bold tabular-nums ${runningRuns > 0 ? 'text-sky-400 animate-pulse' : 'text-slate-300'}`}>
              {runningRuns}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400">Reliability Rate:</span>
            <span className="text-emerald-400 font-bold tabular-nums">{successPercentage}%</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400">Failed / Triage:</span>
            <span className={`font-bold tabular-nums ${failedRuns > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {failedRuns}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Pipeline Matrix Workspace ─────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4 flex-1">
        {/* Search, Filter Bar & Presets */}
        <div className="p-4 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex items-center min-w-[240px] flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by project, commit SHA, branch, or run ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 font-mono transition-colors"
              />
            </div>

            {/* Status Chips */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
              {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'QUEUED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    statusFilter === st
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Environment Filter */}
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="h-8 px-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span>Filtered:</span>
            <span className="text-white font-bold">{filtered.length} runs</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="py-3.5 px-4">Pipeline Run</th>
                  <th className="py-3.5 px-4">Workload</th>
                  <th className="py-3.5 px-4">Git Branch</th>
                  <th className="py-3.5 px-4">Environment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Live Service</th>
                  <th className="py-3.5 px-4">Started</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                      <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2 text-violet-400" />
                      Streaming deployment history from cluster…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                      No deployments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => handleRowClick(d)}
                      className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-white group-hover:text-violet-300 transition-colors">
                          #{d.id.substring(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          By {d.createdBy?.name || d.createdBy?.email || 'Platform Operator'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-white font-medium flex items-center gap-1.5 font-mono">
                          <Terminal className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span>{d.project?.name || 'Workload'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span>{d.branch || 'main'}</span>
                        </div>
                        {d.commitSha && (
                          <span className="text-slate-500 text-[10px] block mt-0.5">
                            sha:{d.commitSha.substring(0, 7)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-white/[0.04] text-slate-300 border border-white/5 capitalize">
                          {d.environment}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderStatusBadge(d.status)}
                      </td>

                      {/* Dedicated Clean Live Service Column */}
                      <td className="py-3.5 px-4">
                        {d.serviceUrl ? (
                          <a
                            href={d.serviceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[11px] font-mono font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] group/link"
                            title={d.serviceUrl}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            <span>Live App</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400 group-hover/link:translate-x-0.5 transition-transform" />
                          </a>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {formatDate(d.startedAt || d.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-white/[0.03] group-hover:bg-violet-600 group-hover:text-white border border-white/10 text-slate-300 text-xs font-mono transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeploymentsPage;
