import React, { useState } from 'react';
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
} from 'lucide-react';
import { PageId, UserProfile, ProjectItem, DeploymentRecord, DeploymentStatus } from '../types';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    name: 'api-gateway',
    repository: 'automated-devops/api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    branch: 'main',
    lastDeployment: '25 min ago',
  },
  {
    id: 'proj-2',
    name: 'auth-service',
    repository: 'automated-devops/auth-service',
    environment: 'Development',
    status: 'Running',
    branch: 'feat/jwt-refresh',
    lastDeployment: '12 min ago',
  },
  {
    id: 'proj-3',
    name: 'web-client',
    repository: 'automated-devops/web-client',
    environment: 'Development',
    status: 'Succeeded',
    branch: 'main',
    lastDeployment: '2 hours ago',
  },
  {
    id: 'proj-4',
    name: 'payment-worker',
    repository: 'automated-devops/payment-worker',
    environment: 'Development',
    status: 'Failed',
    branch: 'fix/stripe-webhook',
    lastDeployment: '48 min ago',
  },
  {
    id: 'proj-5',
    name: 'notification-hub',
    repository: 'automated-devops/notification-hub',
    environment: 'Development',
    status: 'Queued',
    branch: 'main',
    lastDeployment: '1 hour ago',
  },
  {
    id: 'proj-6',
    name: 'inventory-service',
    repository: 'automated-devops/inventory-service',
    environment: 'Development',
    status: 'Running',
    branch: 'release/v1.4',
    lastDeployment: '2 min ago',
  },
];

const INITIAL_DEPLOYMENTS: DeploymentRecord[] = [
  {
    id: '#30',
    project: 'inventory-service',
    environment: 'Development',
    status: 'Running',
    startedAt: '2 min ago',
    errorDetails: '-',
  },
  {
    id: '#29',
    project: 'auth-service',
    environment: 'Development',
    status: 'Running',
    startedAt: '12 min ago',
    errorDetails: '-',
  },
  {
    id: '#28',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '25 min ago',
    errorDetails: '-',
  },
  {
    id: '#27',
    project: 'payment-worker',
    environment: 'Development',
    status: 'Failed',
    startedAt: '48 min ago',
    errorDetails: 'Replicas did not become ready in time',
  },
  {
    id: '#26',
    project: 'notification-hub',
    environment: 'Development',
    status: 'Queued',
    startedAt: '1 hour ago',
    errorDetails: '-',
  },
  {
    id: '#25',
    project: 'web-client',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '2 hours ago',
    errorDetails: '-',
  },
  {
    id: '#24',
    project: 'inventory-service',
    environment: 'Development',
    status: 'Failed',
    startedAt: '3 hours ago',
    errorDetails: 'Health check timeout on port 8080',
  },
  {
    id: '#23',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '4 hours ago',
    errorDetails: '-',
  },
  {
    id: '#22',
    project: 'auth-service',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '5 hours ago',
    errorDetails: '-',
  },
  {
    id: '#21',
    project: 'web-client',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '6 hours ago',
    errorDetails: '-',
  },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user: _user,
  onNavigate: _onNavigate,
  onShowToast,
}) => {
  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [deployments] = useState<DeploymentRecord[]>(INITIAL_DEPLOYMENTS);
  const [projectSearch, setProjectSearch] = useState('');
  const [deploymentStatusFilter, setDeploymentStatusFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Just now');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRepo, setNewProjectRepo] = useState('');

  // Metrics computation
  const totalProjects = projects.length;
  const runningDeployments = deployments.filter((d) => d.status === 'Running').length;
  const failedDeployments = deployments.filter((d) => d.status === 'Failed').length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshedTime('Just now');
      onShowToast('info', 'Telemetry Synced', 'Dashboard metrics and pipeline runs updated.');
    }, 700);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreateModalOpen(false);
    onShowToast('success', 'Project Initialized', `Project "${newProjectName}" registered with automated build trigger.`);
    setNewProjectName('');
    setNewProjectRepo('');
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.repository.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredDeployments = deployments.filter((d) => {
    if (deploymentStatusFilter === 'ALL') return true;
    return d.status.toUpperCase() === deploymentStatusFilter.toUpperCase();
  });

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
            onClick={() => setIsCreateModalOpen(true)}
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
              {totalProjects}
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
                {runningDeployments}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Active
              </span>
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
                {failedDeployments}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Attention
              </span>
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
              {filteredProjects.length}
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
              onClick={() => onShowToast('info', 'Projects Catalog', 'Showing all configured repositories and workspaces.')}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-white transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onShowToast('info', p.name, `Active repository: ${p.repository} [${p.status}]`)}
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
                  {p.repository}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5">
                  {p.environment}
                </span>
                {renderStatusBadge(p.status)}
              </div>
            </div>
          ))}
        </div>

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
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create project</span>
          </button>
        </div>
      </section>

      {/* Bottom Section: Recent Deployments Table */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-4 border-b border-white/5 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Recent deployments</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-[#A1A1B5] font-mono">
              {filteredDeployments.length} entries
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setDeploymentStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  deploymentStatusFilter === status
                    ? 'bg-violet-600/30 text-white border border-violet-500/40 font-semibold'
                    : 'bg-white/[0.03] text-[#A1A1B5] hover:text-white border border-transparent'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Deployments Table */}
        <div className="overflow-x-auto w-full -mx-2 sm:mx-0">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                <th className="py-3 px-4 rounded-l-xl">Deployment ID</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Started</th>
                <th className="py-3 px-4 rounded-r-xl">Safe Error Summary / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredDeployments.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onShowToast('info', `Deployment ${d.id}`, `${d.project} - ${d.status} (${d.startedAt})`)}
                  className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    {d.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-white group-hover:text-violet-300 font-medium transition-colors flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
                      <span>{d.project}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5">
                      {d.environment}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {renderStatusBadge(d.status)}
                  </td>
                  <td className="py-3.5 px-4 text-[#A1A1B5]">
                    {d.startedAt}
                  </td>
                  <td className={`py-3.5 px-4 ${d.errorDetails !== '-' ? 'text-rose-400 font-mono text-[11px]' : 'text-[#A1A1B5]'}`}>
                    {d.errorDetails}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-[#13131F] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Register New Project</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. billing-service"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full h-10 px-3 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                  GitHub Repository (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. automated-devops/billing-service"
                  value={newProjectRepo}
                  onChange={(e) => setNewProjectRepo(e.target.value)}
                  className="w-full h-10 px-3 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#A1A1B5] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:brightness-110"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardPage;
