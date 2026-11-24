import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  GitCommit,
  RotateCcw,
  Terminal,
  XCircle,
  Layers,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Globe,
  Zap,
  Activity,
} from 'lucide-react';
import { PageId } from '../types';
import { deploymentsApi } from '../services/api';

interface DeploymentDetailsPageProps {
  deployment?: any;
  onNavigate: (page: PageId) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DeploymentDetailsPage: React.FC<DeploymentDetailsPageProps> = ({
  deployment: initialDeployment,
  onNavigate,
  onShowToast,
}) => {
  const [deployment, setDeployment] = useState<any>(initialDeployment || null);
  const [steps, setSteps] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!initialDeployment);
  const [isRerunning, setIsRerunning] = useState<boolean>(false);

  const deploymentId = initialDeployment?.id;

  useEffect(() => {
    if (deploymentId) {
      loadDeploymentDetails(deploymentId);
    } else {
      setIsLoading(false);
    }
  }, [deploymentId]);

  const loadDeploymentDetails = async (id: string) => {
    try {
      const data = await deploymentsApi.getById(id);
      if (data.deployment) {
        setDeployment(data.deployment);
        setSteps(data.deployment.steps || []);
        setEvents(data.deployment.events || []);
      }
    } catch (err: any) {
      onShowToast?.('error', 'Load Failed', err.message || 'Could not fetch deployment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerun = async () => {
    if (!deployment?.projectId) return;
    setIsRerunning(true);
    try {
      const res = await deploymentsApi.submit(deployment.projectId, {
        branch: deployment.branch || 'main',
        commitSha: deployment.commitSha || undefined,
        environment: deployment.environment || 'development',
      });
      onShowToast?.('success', 'Pipeline Re-run Queued', `Created deployment #${res.deploymentId.substring(0, 8)}`);
      onNavigate('deployments');
    } catch (err: any) {
      onShowToast?.('error', 'Re-run Failed', err.message || 'Failed to trigger re-run');
    } finally {
      setIsRerunning(false);
    }
  };

  const renderStatusBadge = (status: string | undefined | null) => {
    switch ((status || '').toUpperCase()) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading deployment telemetry…</p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">No Deployment Selected</h2>
        <p className="text-sm text-slate-400 mb-6">Select a deployment from the history table to view details.</p>
        <button
          type="button"
          onClick={() => onNavigate('deployments')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
        >
          View Deployments
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-fadeIn">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-violet-600/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-48 right-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[130px] pointer-events-none -z-10" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('deployments')}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-2.5 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Deployments</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              Deployment #{deployment.id.substring(0, 8)}
            </h1>
            {renderStatusBadge(deployment.status)}
            <span className="font-mono text-xs text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10">
              {deployment.project?.name || deployment.project || 'Project'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Environment: <span className="text-emerald-400 font-semibold capitalize">{deployment.environment}</span> · Started {formatDate(deployment.startedAt || deployment.createdAt)}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {deployment.serviceUrl && (
            <a
              href={deployment.serviceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold font-mono transition-colors shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Endpoint</span>
              <ExternalLink className="w-3 h-3 text-emerald-400" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-mono transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Studio Logs</span>
          </button>

          <button
            type="button"
            onClick={handleRerun}
            disabled={isRerunning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
            <span>{isRerunning ? 'Queueing...' : 'Re-run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Live Application Banner (if SUCCEEDED with serviceUrl) */}
      {deployment.serviceUrl && (
        <div className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-emerald-500/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Live NodePort Endpoint</h4>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ONLINE</span>
              </div>
              <a
                href={deployment.serviceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 mt-1"
              >
                <span>{deployment.serviceUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <a
            href={deployment.serviceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] shrink-0"
          >
            <Globe className="w-4 h-4 text-slate-950" />
            <span>Launch App</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
          </a>
        </div>
      )}

      {/* Failure Banner (if failed) */}
      {deployment.status === 'FAILED' && deployment.errorMessage && (
        <div className="rounded-2xl sm:rounded-3xl bg-rose-500/10 border border-rose-500/25 p-5 flex items-start gap-3.5 z-10 shadow-lg">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-300">Execution Error Diagnostic</h4>
            <p className="text-xs font-mono text-rose-200/90 whitespace-pre-wrap break-all leading-relaxed">
              {deployment.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Telemetry Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Git Branch</span>
          <div className="flex items-center gap-2 mt-2 text-white font-mono text-sm">
            <GitBranch className="w-4 h-4 text-violet-400 shrink-0" />
            <span>{deployment.branch || 'main'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Commit Reference</span>
          <div className="flex items-center gap-2 mt-2 text-white font-mono text-sm">
            <GitCommit className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-violet-300">{deployment.commitSha ? deployment.commitSha.substring(0, 10) : 'HEAD (clean)'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Pod Replicas</span>
          <div className="flex items-center gap-2 mt-2 text-white font-mono text-sm">
            <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{deployment.replicas || 1} instance(s) ready</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#080911] border border-white/[0.08] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Operator Trigger</span>
          <div className="mt-2 text-white text-sm font-mono truncate font-medium">
            {deployment.createdBy?.name || deployment.createdBy?.email || 'GitHub Actions / Webhook'}
          </div>
        </div>
      </section>

      {/* Pipeline Steps Section */}
      {steps.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-white/[0.08] p-6 z-10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <span>Pipeline Stage Executions</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {steps.filter((s: any) => s.status === 'SUCCEEDED' || s.status === 'PASS').length}/{steps.length} Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {steps.map((st: any) => (
              <div key={st.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">#{st.order} {st.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    st.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400' :
                    st.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-sky-500/20 text-sky-400'
                  }`}>
                    {st.status}
                  </span>
                </div>
                {st.errorMessage && (
                  <p className="text-rose-400 text-[11px] truncate">{st.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline Events Section */}
      {events.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-[#080911] border border-white/[0.08] p-6 z-10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>State Transition Milestones</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{events.length} events logged</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-slate-400 shrink-0 text-[11px]">
                  {formatDate(ev.createdAt)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {ev.stage || 'STAGE'}
                </span>
                <span className="text-slate-200 flex-1">{ev.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DeploymentDetailsPage;
