import React, { useState } from 'react';
import {
  Search,
  Terminal,
  ChevronRight,
  RefreshCw,
  GitCommit,
} from 'lucide-react';
import { PageId, DeploymentRecord, DeploymentStatus } from '../types';

interface DeploymentsPageProps {
  onNavigate: (page: PageId) => void;
  onSelectDeployment?: (deployment: DeploymentRecord) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DeploymentsPage: React.FC<DeploymentsPageProps> = ({
  onNavigate,
  onSelectDeployment,
  onShowToast,
}) => {
  const [deployments] = useState<DeploymentRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = deployments.filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status.toUpperCase() === statusFilter.toUpperCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      d.id.toLowerCase().includes(query) ||
      d.project.toLowerCase().includes(query) ||
      (d.commitMessage && d.commitMessage.toLowerCase().includes(query)) ||
      (d.author && d.author.toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  });

  const handleRowClick = (deployment: DeploymentRecord) => {
    if (onSelectDeployment) {
      onSelectDeployment(deployment);
    }
    onNavigate('deployment-details');
  };

  const renderStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case 'Succeeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'Queued':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Queued</span>
          </span>
        );
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
              {filtered.length} runs
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
            onClick={() => onShowToast?.('info', 'Telemetry Synced', 'Refreshed active pipeline runs.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A1A1B5]" />
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

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                <th className="py-3 px-4">Deployment</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Commit</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Triggered By</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Started</th>
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
                    {d.id}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white group-hover:text-violet-300 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
                      <span>{d.project}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <code className="text-violet-300 font-mono text-[11px]">{d.commitHash}</code>
                      <span className="text-[#A1A1B5] truncate max-w-[200px]">{d.commitMessage}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5">
                      {d.environment}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {renderStatusBadge(d.status)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">
                    {d.author}
                  </td>
                  <td className="py-3.5 px-4 text-[#A1A1B5] font-mono">
                    {d.duration}
                  </td>
                  <td className="py-3.5 px-4 text-[#A1A1B5]">
                    {d.startedAt}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <ChevronRight className="w-4 h-4 text-[#A1A1B5] group-hover:text-violet-300 transition-all inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default DeploymentsPage;
