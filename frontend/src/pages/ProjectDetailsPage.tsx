import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Play,
  Terminal,
  Activity,
  Layers,
  Clock,
  ChevronRight,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { PageId, ProjectItem, DeploymentRecord, DeploymentStatus } from '../types';

interface ProjectDetailsPageProps {
  project?: ProjectItem;
  onNavigate: (page: PageId) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const DEFAULT_PROJECT_DETAILS: ProjectItem = {
  id: 'api-gateway',
  name: 'api-gateway',
  repository: 'automated-devops/api-gateway',
  environment: 'Development',
  status: 'Succeeded',
  branch: 'main',
  lastDeployment: '25 min ago',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  envVars: [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '8080' },
    { key: 'CACHE_TTL', value: '3600' },
  ],
};

const PROJECT_DEPLOYMENTS: DeploymentRecord[] = [
  {
    id: '#28',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '25 min ago',
    branch: 'main',
    commitHash: '7f9c2a1',
    commitMessage: 'feat: add rate limiting middleware for public endpoints',
    author: 'Alex Morgan',
    duration: '1m 38s',
  },
  {
    id: '#23',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '4 hours ago',
    branch: 'main',
    commitHash: '3b81ef0',
    commitMessage: 'refactor: split router modules and optimize cold start',
    author: 'Alex Morgan',
    duration: '1m 45s',
  },
  {
    id: '#19',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Failed',
    startedAt: '1 day ago',
    branch: 'fix/cors-headers',
    commitHash: '9a10cb4',
    commitMessage: 'fix: allow wildcard subdomains for preview ingress',
    author: 'Taylor Chen',
    duration: '2m 10s',
    errorDetails: 'Unit test suite failed in auth integration test',
  },
  {
    id: '#15',
    project: 'api-gateway',
    environment: 'Development',
    status: 'Succeeded',
    startedAt: '2 days ago',
    branch: 'main',
    commitHash: 'e50c412',
    commitMessage: 'chore: upgrade docker base image to alpine-node 20',
    author: 'Alex Morgan',
    duration: '1m 29s',
  },
];

export const ProjectDetailsPage: React.FC<ProjectDetailsPageProps> = ({
  project = DEFAULT_PROJECT_DETAILS,
  onNavigate,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'deployments' | 'config' | 'settings'>('deployments');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleTriggerDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      onShowToast?.('success', 'Pipeline Triggered', `New deployment run initiated for ${project.name} on branch main.`);
      onNavigate('deployment-logs');
    }, 900);
  };

  const renderStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case 'Succeeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to projects</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#A1A1B5]">
              {project.environment}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Healthy
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#A1A1B5] font-mono">
            <GitBranch className="w-3.5 h-3.5 text-violet-400" />
            <span>Branch: <code className="text-white">main</code></span>
            <span>·</span>
            <span>{project.repository}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
            <span>Live Logs</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerDeploy}
            disabled={isDeploying}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isDeploying ? 'animate-spin' : ''}`} />
            <span>{isDeploying ? 'Deploying...' : 'Deploy Now'}</span>
          </button>
        </div>
      </div>

      {/* 3 Telemetry Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        <div className="p-5 rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Success Rate</p>
            <p className="text-2xl font-bold text-white mt-0.5">98.2%</p>
            <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 23 of 24 deploys clean
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Avg Build Time</p>
            <p className="text-2xl font-bold text-white mt-0.5">1m 42s</p>
            <p className="text-xs text-[#A1A1B5] mt-0.5">Compiled &amp; containerized</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Total Runs</p>
            <p className="text-2xl font-bold text-white mt-0.5">24</p>
            <p className="text-xs text-[#A1A1B5] mt-0.5">Automated webhooks active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1 z-10">
        {[
          { id: 'deployments', label: 'Deployments History', icon: <Layers className="w-4 h-4" /> },
          { id: 'config', label: 'Configuration & Env', icon: <Settings className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_0_#8B5CF6]'
                : 'text-[#A1A1B5] hover:text-white hover:bg-white/5'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Deployments History Table */}
      {activeTab === 'deployments' && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 z-10 shadow-xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                  <th className="py-3 px-4">Run</th>
                  <th className="py-3 px-4">Commit</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {PROJECT_DEPLOYMENTS.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onNavigate('deployment-details')}
                    className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {d.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-violet-300 font-mono text-[11px]">{d.commitHash}</code>
                        <span className="text-[#A1A1B5] truncate max-w-[260px]">{d.commitMessage}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#A1A1B5]">
                      {d.branch}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(d.status)}
                    </td>
                    <td className="py-3.5 px-4 text-[#A1A1B5]">
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
      )}

      {/* Tab 2: Configuration & Env */}
      {activeTab === 'config' && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 space-y-6 z-10 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-xs font-mono text-[#A1A1B5] uppercase">Build Command</p>
              <code className="text-sm font-mono text-white block mt-1">{project.buildCommand || 'npm run build'}</code>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-xs font-mono text-[#A1A1B5] uppercase">Output Directory</p>
              <code className="text-sm font-mono text-white block mt-1">{project.outputDirectory || 'dist'}</code>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-3">Injected Environment Variables</h3>
            <div className="space-y-2">
              {(project.envVars || DEFAULT_PROJECT_DETAILS.envVars!).map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#09090F] border border-white/5 font-mono text-xs">
                  <span className="text-violet-300 font-bold">{ev.key}</span>
                  <span className="text-gray-400">•••••••••••• ({ev.value.slice(0, 4)}...)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectDetailsPage;
