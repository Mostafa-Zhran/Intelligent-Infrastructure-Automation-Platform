import React, { useState, useEffect } from 'react';
import {
  Search,
  Terminal,
  ChevronRight,
  RefreshCw,
  GitCommit,
  Layers,
  Plus,
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeployments();
  }, [statusFilter]);

  const fetchDeployments = async () => {
    setIsLoading(true);
    try {
      const data = await deploymentsApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setDeployments(data.deployments || []);
    } catch (err: any) {
      onShowToast?.('error', 'Fetch Failed', err.message || 'Failed to fetch deployments');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = deployments.filter((d) => {
    const query = searchQuery.toLowerCase();
    const projectName = d.project?.name?.toLowerCase() || '';
    const id = d.id.toLowerCase();
    const branch = d.branch?.toLowerCase() || '';
    const commit = d.commitSha?.toLowerCase() || '';
    const author = d.createdBy?.name?.toLowerCase() || d.createdBy?.email?.toLowerCase() || '';

    return (
      projectName.includes(query) ||
      id.includes(query) ||
      branch.includes(query) ||
      commit.includes(query) ||
      author.includes(query)
    );
  });

  const handleRowClick = (deployment: ApiDeployment) => {
    if (onSelectDeployment) {
      onSelectDeployment(deployment);
    }
    onNavigate('deployment-details');
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Deployments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#A1A1B5]">
              {isLoading ? '…' : `${filtered.length} runs`}
            </span>
          </div>
          <p className="text-sm text-[#A1A1B5]">Global history of automated and manual deployment pipelines.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search commit or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 sm:w-64 h-10 pl-10 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>

          <button
            type="button"
            onClick={fetchDeployments}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A1A1B5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Deployments Card */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden z-10">
        {/* Status Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'QUEUED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-violet-600/30 text-white border border-violet-500/40 font-semibold'
                    : 'bg-white/[0.03] text-[#A1A1B5] hover:text-white border border-transparent'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#A1A1B5] font-mono">
            Showing {filtered.length} deployments
          </span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mb-3" />
            <p className="text-sm text-[#A1A1B5]">Loading deployment history…</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5] mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No deployments found</h3>
            <p className="text-xs text-[#A1A1B5] mb-6 max-w-sm">
              {statusFilter !== 'ALL'
                ? `No deployments with status "${statusFilter}". Try switching filters.`
                : 'No deployments have been executed yet. Deploy a project to start seeing pipelines here.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-project')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md hover:brightness-110"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy a Project</span>
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                  <th className="py-3 px-4">Deployment ID</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Branch / Commit</th>
                  <th className="py-3 px-4">Environment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Triggered By</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => handleRowClick(d)}
                    className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {d.id.substring(0, 8)}…
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-violet-300 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
                        <span>{d.project?.name || 'Project'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-white font-mono text-xs">{d.branch || 'main'}</span>
                        {d.commitSha && (
                          <code className="text-violet-300 font-mono text-[11px]">
                            ({d.commitSha.substring(0, 7)})
                          </code>
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
                    <td className="py-3.5 px-4 text-gray-300">
                      {d.createdBy?.name || d.createdBy?.email || 'System'}
                    </td>
                    <td className="py-3.5 px-4 text-[#A1A1B5]">
                      {formatDate(d.startedAt || d.createdAt)}
                    </td>
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
    </div>
  );
};

export default DeploymentsPage;
