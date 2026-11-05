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
  Grid,
  FolderX,
} from 'lucide-react';
import { PageId, UserProfile } from '../types';
import { projectsApi, Project } from '../services/api';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user: _user,
  onNavigate,
  onShowToast,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Just now');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const { projects: list } = await projectsApi.list();
      setProjects(list || []);
    } catch {
      // silently fail on dashboard
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Metrics
  const totalProjects = projects.length;
  const runningDeployments = projects.filter(
    (p) => p.latestDeployment?.status === 'RUNNING'
  ).length;
  const failedDeployments = projects.filter(
    (p) => p.latestDeployment?.status === 'FAILED'
  ).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjects();
    setIsRefreshing(false);
    setLastRefreshedTime('Just now');
    onShowToast('info', 'Telemetry Synced', 'Dashboard metrics and pipeline runs updated.');
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.githubRepoFullName || '').toLowerCase().includes(projectSearch.toLowerCase())
  );

  const renderDeployStatusBadge = (status: string | undefined | null) => {
    switch ((status || '').toUpperCase()) {
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
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Queued</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-[#A1A1B5]">Overview of your projects and deployments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-[#A1A1B5] hidden sm:inline-block">
            Last updated: {lastRefreshedTime}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A1A1B5] ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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

      {/* Top Section: 3 Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        {/* Card 1: Total Projects */}
        <div className="relative overflow-hidden rounded-2xl bg-[#13131F]/80 backdrop-blur-xl p-6 flex items-center justify-between border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] group hover:border-white/20 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Total Projects
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {isLoadingProjects ? '…' : totalProjects}
            </span>
            <span className="text-xs text-[#A1A1B5]">Active tracked repositories</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-violet-300 shadow-[0_0_20px_-4px_rgba(192,193,255,0.25)] group-hover:scale-105 transition-transform">
            <FolderGit2 className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Running Deployments */}
        <div className="relative overflow-hidden rounded-2xl bg-[#13131F]/80 backdrop-blur-xl p-6 flex items-center justify-between border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] group hover:border-sky-500/30 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Running Deployments
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {isLoadingProjects ? '…' : runningDeployments}
              </span>
              {runningDeployments > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Active
                </span>
              )}
            </div>
            <span className="text-xs text-[#A1A1B5]">Currently building &amp; syncing</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-sky-400 shadow-[0_0_20px_-4px_rgba(123,208,255,0.25)] group-hover:scale-105 transition-transform">
            <RefreshCw className="w-7 h-7 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Card 3: Failed Deployments */}
        <div className="relative overflow-hidden rounded-2xl bg-[#13131F]/80 backdrop-blur-xl p-6 flex items-center justify-between border border-white/10 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] group hover:border-rose-500/30 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Failed Deployments
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {isLoadingProjects ? '…' : failedDeployments}
              </span>
              {failedDeployments > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Attention
                </span>
              )}
            </div>
            <span className="text-xs text-[#A1A1B5]">Last 24 hours</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-rose-400 shadow-[0_0_20px_-4px_rgba(255,180,171,0.2)] group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
      </section>

      {/* Middle Section: Projects Grid */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-white/5 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Projects</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-[#A1A1B5] font-mono">
              {isLoadingProjects ? '…' : filteredProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-48 sm:w-60 h-8 pl-8 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors"
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

        {/* Loading */}
        {isLoadingProjects && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs text-[#A1A1B5]">Loading projects…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingProjects && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5]">
              <FolderX className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">No projects yet</p>
            <p className="text-xs text-[#A1A1B5]">Create your first project to get started.</p>
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

        {/* Projects grid */}
        {!isLoadingProjects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredProjects.slice(0, 6).map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate('projects')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#0F0F19]/80 hover:bg-[#161624] border border-white/10 hover:border-violet-500/30 transition-all duration-200 cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_28px_-6px_rgba(139,92,246,0.18)]"
              >
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {p.name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[#A1A1B5] group-hover:text-violet-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <span className="font-mono text-xs text-[#A1A1B5] truncate">
                    {p.githubRepoFullName || p.repositoryUrl || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5 capitalize">
                    {p.defaultEnvironment}
                  </span>
                  {p.latestDeployment
                    ? renderDeployStatusBadge(p.latestDeployment.status)
                    : renderDeployStatusBadge(p.setupStatus)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sub-block / Connect repo prompt */}
        <div className="mt-6 p-5 sm:p-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5] shrink-0">
              <Grid className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Need a new environment or microservice?</p>
              <p className="text-xs text-[#A1A1B5]">Connect a Git repo to launch automated container builds and preview branches.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create project</span>
          </button>
        </div>
      </section>

      {/* Bottom Section: Recent Deployments from projects */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-4 border-b border-white/5 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Recent deployments</h2>
          </div>
        </div>

        <div className="overflow-x-auto w-full -mx-2 sm:mx-0">
          <table className="w-full text-left text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                <th className="py-3 px-4 rounded-l-xl">Project</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {isLoadingProjects ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#A1A1B5]">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading…
                  </td>
                </tr>
              ) : projects.filter((p) => p.latestDeployment).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#A1A1B5] text-xs">
                    No deployments yet.
                  </td>
                </tr>
              ) : (
                projects
                  .filter((p) => p.latestDeployment)
                  .slice(0, 5)
                  .map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => onNavigate('projects')}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <span className="text-white group-hover:text-violet-300 font-medium transition-colors flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
                          <span>{p.name}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5 capitalize">
                          {p.latestDeployment!.environment}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#A1A1B5]">
                        {p.latestDeployment!.branch || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderDeployStatusBadge(p.latestDeployment!.status)}
                      </td>
                      <td className="py-3.5 px-4 text-[#A1A1B5]">
                        {new Date(p.latestDeployment!.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
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
