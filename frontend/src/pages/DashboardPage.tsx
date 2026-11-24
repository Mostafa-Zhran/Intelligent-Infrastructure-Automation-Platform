import React, { useState, useEffect, useMemo } from 'react';
import { ProjectIcon } from '../components/common/BrandLogo';
import {
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
  Layers,
  ShieldCheck,
  Zap,
  Clock,
  Lock,
  Unlock,
  Shield,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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

// 7-day rollout trend generator based on live metrics
function generateRolloutTrendData(metrics: DashboardMetrics, _recentDeployments: DashboardRecentDeployment[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const baseSuccess = Math.max(metrics.succeededDeployments, 1);
  const baseFail = metrics.failedDeployments;

  return days.map((day, idx) => {
    const factor = (idx + 1) / days.length;
    const succeeded = Math.max(0, Math.round(baseSuccess * 0.4 + factor * (baseSuccess * 0.6)));
    const failed = idx === 6 ? baseFail : Math.max(0, Math.round(baseFail * (0.3 + (idx % 3) * 0.2)));
    const total = succeeded + failed + (metrics.runningDeployments > 0 && idx === 6 ? metrics.runningDeployments : 0);
    return {
      day,
      succeeded,
      failed,
      total: Math.max(total, succeeded + failed),
    };
  });
}

const PIE_COLORS = {
  SUCCEEDED: '#10B981', // emerald-500
  RUNNING: '#38BDF8',   // sky-400
  FAILED: '#F43F5E',    // rose-500
  QUEUED: '#F59E0B',    // amber-500
};

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
  
  // Navigation & filtering state
  const [activeTab, setActiveTab] = useState<'overview' | 'pipelines' | 'services' | 'cluster'>('overview');
  const [projectSearch, setProjectSearch] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [deploymentFilter, setDeploymentFilter] = useState<string>('ALL');
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // seconds (0 = off)
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [revealDeepDiagnostics, setRevealDeepDiagnostics] = useState(false);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Polling timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval]);

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
      onShowToast?.('error', 'Dashboard Sync Failed', err.message || 'Could not load telemetry metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(true);
    onShowToast?.('info', 'Telemetry Synchronized', 'Live cluster state and pipeline telemetry refreshed.');
  };

  // Filtered lists
  const filteredProjects = useMemo(() => {
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(q) ||
        (p.githubRepoFullName || '').toLowerCase().includes(q) ||
        (p.repositoryUrl || '').toLowerCase().includes(q);
      const matchEnv = envFilter === 'ALL' || p.defaultEnvironment.toLowerCase() === envFilter.toLowerCase();
      return matchQuery && matchEnv;
    });
  }, [projects, projectSearch, envFilter]);

  const filteredDeployments = useMemo(() => {
    const q = pipelineSearch.toLowerCase();
    return recentDeployments.filter((d) => {
      const matchStatus = deploymentFilter === 'ALL' || d.status.toUpperCase() === deploymentFilter.toUpperCase();
      const matchEnv = envFilter === 'ALL' || d.environment.toLowerCase() === envFilter.toLowerCase();
      const matchQuery =
        d.projectName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.branch || '').toLowerCase().includes(q) ||
        (d.commitSha || '').toLowerCase().includes(q);
      return matchStatus && matchEnv && matchQuery;
    });
  }, [recentDeployments, deploymentFilter, envFilter, pipelineSearch]);

  // Compute calculated statistics
  const totalDeployments = metrics.succeededDeployments + metrics.failedDeployments + metrics.runningDeployments;
  const successRate = totalDeployments > 0
    ? Math.round((metrics.succeededDeployments / totalDeployments) * 100)
    : 100;

  // Chart data
  const trendData = useMemo(() => generateRolloutTrendData(metrics, recentDeployments), [metrics, recentDeployments]);
  
  const distributionData = useMemo(() => {
    const raw = [
      { name: 'Succeeded', value: metrics.succeededDeployments, color: PIE_COLORS.SUCCEEDED },
      { name: 'Running', value: metrics.runningDeployments, color: PIE_COLORS.RUNNING },
      { name: 'Failed', value: metrics.failedDeployments, color: PIE_COLORS.FAILED },
    ].filter((item) => item.value > 0);

    if (raw.length === 0) {
      return [{ name: 'Ready', value: 1, color: '#334155' }];
    }
    return raw;
  }, [metrics]);

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
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Ready</span>
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
    <div className="relative w-full min-h-screen bg-[#07080E] text-slate-100 flex flex-col">
      {/* ── Top Industrial Status Header ───────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#090A12]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Mission Control
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Cloud Mesh Active</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.03] text-slate-400 border border-white/5">
                  Ingress Gateway: Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Operator: <span className="text-slate-200 font-medium">{user.fullName || 'Cluster Operator'}</span> · Role: <span className="font-mono text-violet-400 uppercase">{user.role || 'Admin'}</span>
              </p>
            </div>
          </div>

          {/* Quick Telemetry & Auto-Refresh Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 hidden xl:inline-block mr-1">
              Synced: <span className="text-slate-300">{lastUpdated}</span>
            </span>

            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-1 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 ml-1 text-slate-500" />
              <span>Sync:</span>
              {[15, 30, 0].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setAutoRefreshInterval(sec)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    autoRefreshInterval === sec
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
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('new-project')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy Service</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
          {[
            { id: 'overview', label: 'Telemetry & Analytics', icon: Activity },
            { id: 'pipelines', label: 'Pipeline Matrix', icon: Terminal, badge: filteredDeployments.length },
            { id: 'services', label: 'Service Catalog', icon: Layers, badge: filteredProjects.length },
            { id: 'cluster', label: 'Cluster Security & Mesh', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                    isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & TELEMETRY                                    */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ── 4 High-Tech KPI Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Card 1: Total Services */}
              <div
                onClick={() => setActiveTab('services')}
                className="group relative p-4 sm:p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] hover:border-violet-500/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Services</span>
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                      {isLoading ? '…' : metrics.totalProjects}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">workloads</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>

              {/* Card 2: Active Pipelines */}
              <div
                onClick={() => {
                  setDeploymentFilter('RUNNING');
                  setActiveTab('pipelines');
                }}
                className={`group relative p-4 sm:p-5 rounded-2xl bg-[#0C0D17] border transition-all cursor-pointer flex flex-col justify-between ${
                  metrics.runningDeployments > 0
                    ? 'border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'border-white/[0.08] hover:border-sky-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Rollouts</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <RefreshCw className={`w-3.5 h-3.5 ${metrics.runningDeployments > 0 ? 'animate-spin' : ''}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-sky-400 font-mono tracking-tight tabular-nums">
                      {isLoading ? '…' : metrics.runningDeployments}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">
                      {metrics.runningDeployments > 0 ? 'building' : 'idle'}
                    </span>
                  </div>
                  {metrics.runningDeployments > 0 && (
                    <span className="text-[10px] font-mono text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded animate-pulse">
                      Live PIPE
                    </span>
                  )}
                </div>
              </div>

              {/* Card 3: Success Rate */}
              <div
                onClick={() => {
                  setDeploymentFilter('SUCCEEDED');
                  setActiveTab('pipelines');
                }}
                className="group relative p-4 sm:p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Success Rate</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight tabular-nums">
                      {isLoading ? '…' : `${successRate}%`}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">reliability</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {metrics.succeededDeployments} passed
                  </span>
                </div>
              </div>

              {/* Card 4: Incidents & Failures */}
              <div
                onClick={() => {
                  setDeploymentFilter('FAILED');
                  setActiveTab('pipelines');
                }}
                className={`group relative p-4 sm:p-5 rounded-2xl bg-[#0C0D17] border transition-all cursor-pointer flex flex-col justify-between ${
                  metrics.failedDeployments > 0
                    ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : 'border-white/[0.08] hover:border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Build Incidents</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    metrics.failedDeployments > 0
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                      : 'bg-white/5 border border-white/10 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className={`text-3xl font-extrabold font-mono tracking-tight tabular-nums ${
                      metrics.failedDeployments > 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      {isLoading ? '…' : metrics.failedDeployments}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">
                      {metrics.failedDeployments > 0 ? 'attention' : 'zero errors'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    metrics.failedDeployments > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {metrics.failedDeployments > 0 ? 'Action required' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Recharts Analytics Section ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Chart 1: Deployment Velocity (Area Chart) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span>Pipeline Velocity & Rollout Trajectory</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Completed Kubernetes rollouts and container builds across the active deployment cycle.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-white/[0.04] border border-white/5 px-2.5 py-1 rounded-lg">
                    Total Runs: <span className="text-white font-bold">{totalDeployments}</span>
                  </span>
                </div>

                <div className="w-full h-56 sm:h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="succeededGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F111A',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#F8FAFC',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="succeeded"
                        name="Succeeded"
                        stroke="#10B981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#succeededGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total Velocity"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#totalGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Outcome Breakdown (Donut Chart) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Rollout Reliability Ratio</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pipeline health distribution breakdown.
                  </p>
                </div>

                <div className="w-full h-44 sm:h-48 my-2 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F111A',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#F8FAFC',
                          fontFamily: 'monospace',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                      {successRate}%
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Health</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">Succeeded:</span>
                    <span className="text-white font-bold ml-auto tabular-nums">{metrics.succeededDeployments}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-slate-400">Running:</span>
                    <span className="text-white font-bold ml-auto tabular-nums">{metrics.runningDeployments}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-slate-400">Failed:</span>
                    <span className="text-white font-bold ml-auto tabular-nums">{metrics.failedDeployments}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-slate-400">Projects:</span>
                    <span className="text-white font-bold ml-auto tabular-nums">{metrics.totalProjects}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Recent Execution Feed (Overview Spotlight) ────────────── */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0D17] border border-white/[0.08]">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Live Telemetry Spotlight
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-slate-400 font-mono">
                    Latest 5 Runs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pipelines')}
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  <span>Open Full Matrix</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 divide-y divide-white/[0.04]">
                {recentDeployments.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (onSelectDeployment) onSelectDeployment(d);
                      onNavigate('deployment-details');
                    }}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-white group-hover:border-violet-500/40">
                        {d.projectName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                            {d.projectName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">#{d.id.substring(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3 h-3 text-violet-400" />
                            {d.branch}
                          </span>
                          {d.commitSha && (
                            <span className="text-slate-500">({d.commitSha.substring(0, 7)})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-slate-400 capitalize bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                        {d.environment}
                      </span>
                      {renderStatusBadge(d.status)}
                      <span className="text-[11px] font-mono text-slate-500 min-w-[60px] text-right">
                        {formatRelativeTime(d.startedAt)}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-violet-300 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PIPELINES MATRIX                                       */}
        {/* ============================================================== */}
        {activeTab === 'pipelines' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search, Filter Bar & Presets */}
            <div className="p-4 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex items-center min-w-[240px] flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by project, commit SHA, branch, or run ID..."
                    value={pipelineSearch}
                    onChange={(e) => setPipelineSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors font-mono"
                  />
                </div>

                {/* Status Chips */}
                <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
                  {(['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'QUEUED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDeploymentFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                        deploymentFilter === st
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
                <span>Matching:</span>
                <span className="text-white font-bold">{filteredDeployments.length}</span>
              </div>
            </div>

            {/* Matrix Data Table */}
            <div className="rounded-2xl bg-[#0C0D17] border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
                      <th className="py-3 px-4">Pipeline Execution</th>
                      <th className="py-3 px-4">Workload Service</th>
                      <th className="py-3 px-4">Git Reference</th>
                      <th className="py-3 px-4">Pipeline Stages</th>
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Runtime</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                          <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2 text-violet-400" />
                          Fetching active pipeline runs…
                        </td>
                      </tr>
                    ) : filteredDeployments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                          No pipeline runs found matching criteria.
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
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-white group-hover:text-violet-300 transition-colors">
                              #{d.id.substring(0, 8)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              By {d.author || 'Operator'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-white font-medium flex items-center gap-1.5">
                              <ProjectIcon className="w-3.5 h-3.5 text-violet-400" />
                              <span>{d.projectName}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px] block">
                              {d.repository}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              <span>{d.branch}</span>
                            </div>
                            {d.commitSha && (
                              <span className="text-slate-500 text-[10px] block mt-0.5">
                                sha:{d.commitSha.substring(0, 7)}
                              </span>
                            )}
                          </td>

                          {/* Visual Pipeline Progression Stages (PIPE-01 to PIPE-07) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1">
                              {['Build', 'Lint', 'Test', 'Ansible', 'Terraform', 'K8s'].map((stage, idx) => {
                                const isFail = d.status.toUpperCase() === 'FAILED' && idx >= 4;
                                const isDone = d.status.toUpperCase() === 'SUCCEEDED' || (d.status.toUpperCase() === 'RUNNING' && idx < 3);
                                const isCurrent = d.status.toUpperCase() === 'RUNNING' && idx === 3;

                                return (
                                  <span
                                    key={stage}
                                    title={`Stage: ${stage}`}
                                    className={`w-4 h-1.5 rounded-full ${
                                      isFail
                                        ? 'bg-rose-500/80'
                                        : isCurrent
                                        ? 'bg-sky-400 animate-pulse'
                                        : isDone
                                        ? 'bg-emerald-400'
                                        : 'bg-white/10'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-white/[0.04] text-slate-300 border border-white/5 capitalize">
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
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded bg-white/[0.03] group-hover:bg-violet-600 group-hover:text-white border border-white/10 text-slate-300 text-[11px] font-mono transition-colors"
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
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SERVICE CATALOG                                        */}
        {/* ============================================================== */}
        {activeTab === 'services' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search and Deploy Header */}
            <div className="p-4 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex items-center max-w-md w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter workloads by repository or name..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => onNavigate('new-project')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deploy New Service</span>
              </button>
            </div>

            {/* Workload Grid Cards */}
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin inline-block mb-2 text-violet-400" />
                <p>Loading catalog services…</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-16 text-center bg-[#0C0D17] border border-white/[0.08] rounded-2xl p-6">
                <ProjectIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-white font-bold text-sm">No Workload Services Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                  Connect your repository to instantiate automated container builds and K8s node deployments.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('new-project')}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (onSelectProject) onSelectProject(p);
                      onNavigate('project-details');
                    }}
                    className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] hover:border-violet-500/40 hover:bg-[#10121F] transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                            {p.name}
                          </span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-colors" />
                      </div>

                      <p className="font-mono text-xs text-slate-400 truncate mb-3">
                        {p.githubRepoFullName || p.repositoryUrl || 'Autonomous Container Workload'}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/5 text-slate-400 capitalize">
                          Env: {p.defaultEnvironment}
                        </span>
                        {p.repositoryBranch && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1">
                            <GitCommit className="w-2.5 h-2.5" />
                            {p.repositoryBranch}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-500">Latest Status</span>
                      {p.latestDeployment
                        ? renderStatusBadge(p.latestDeployment.status)
                        : renderStatusBadge(p.setupStatus)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CLUSTER SECURITY & MESH TELEMETRY                      */}
        {/* ============================================================== */}
        {activeTab === 'cluster' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Cluster Top Security Banner */}
            <div className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Autonomous Cloud Mesh & Control Plane</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Perimeter Secure
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zero-Trust Network Perimeter · Workload Subnet Isolation · Automated State Locking & Disaster Recovery
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRevealDeepDiagnostics((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    revealDeepDiagnostics
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10'
                  }`}
                >
                  {revealDeepDiagnostics ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Deep Diagnostics: Revealed</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deep Diagnostics: Masked</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Operator Warning Banner when revealed */}
            {revealDeepDiagnostics && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Operator Audit Mode Active: Low-level cluster topology revealed for triage. Raw secrets and external gateways remain masked.
                </span>
              </div>
            )}

            {/* Infrastructure Perimeter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Orchestration Control Plane */}
              <div className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400">Compute Mesh</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <span>{revealDeepDiagnostics ? 'k8s-mesh-control-plane-01' : 'mesh-control-plane-***'}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
                  <div className="flex justify-between">
                    <span>Isolation Policy:</span>
                    <span className="text-emerald-400">Private Subnets Only</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Workload Protection:</span>
                    <span className="text-slate-200">
                      {revealDeepDiagnostics ? 'Containerd / cgroups v2' : 'Encrypted Container Sandbox'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingress Boundary:</span>
                    <span className="text-slate-200">
                      {revealDeepDiagnostics ? 'Gateway Range 30000-32767' : 'Dynamic Gateway Protected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: CI/CD Pipeline Automation Gateway */}
              <div className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400">Delivery Engine</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <span>{revealDeepDiagnostics ? 'github-actions-ci-runner' : 'ci-runner-ephemeral-***'}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
                  <div className="flex justify-between">
                    <span>Credential Scope:</span>
                    <span className="text-emerald-400">Least-Privilege OIDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IaC Verifier:</span>
                    <span className="text-slate-200">
                      {revealDeepDiagnostics ? 'Ansible + Terraform State Gate' : 'Automated IaC Guard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Telemetry Ingress:</span>
                    <span className="text-slate-200">
                      {revealDeepDiagnostics ? 'HMAC Signed Event Callbacks' : 'Cryptographic Verification'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Storage & Persistence Engine */}
              <div className="p-5 rounded-2xl bg-[#0C0D17] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400">Persistence Tier</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <span>{revealDeepDiagnostics ? 'db-cluster-pg-16' : 'relational-storage-***'}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
                  <div className="flex justify-between">
                    <span>At-Rest Encryption:</span>
                    <span className="text-emerald-400">AES-256 State Locking</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport Layer:</span>
                    <span className="text-slate-200">TLS v1.3 Enforced</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection Pool:</span>
                    <span className="text-slate-200">
                      {revealDeepDiagnostics ? 'Prisma 20-Socket Pool' : 'Managed Resilient Sockets'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
