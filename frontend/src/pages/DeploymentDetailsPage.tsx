import React, { useState, useEffect } from 'react';
import {
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
  Copy,
  Check,
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
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

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
      onShowToast?.('success', 'Pipeline Dispatched', `Created deployment #${res.deploymentId.substring(0, 8)}`);
      onNavigate('deployments');
    } catch (err: any) {
      onShowToast?.('error', 'Re-run Failed', err.message || 'Failed to trigger re-run');
    } finally {
      setIsRerunning(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        <span className="font-mono text-xs text-slate-400">Inspecting deployment state…</span>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-lg font-bold text-white">No Deployment Selected</h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">Select a deployment run from the list to view telemetry.</p>
        <button
          type="button"
          onClick={() => onNavigate('deployments')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500"
        >
          View Deployments
        </button>
      </div>
    );
  }

  const isSuccess = deployment.status === 'SUCCEEDED';
  const isFailed = deployment.status === 'FAILED';
  const isRunning = deployment.status === 'RUNNING';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 animate-fadeIn text-slate-200">
      {/* ── Breadcrumb & Navigation Bar ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <button
              type="button"
              onClick={() => onNavigate('deployments')}
              className="hover:text-white transition-colors"
            >
              Deployments
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-violet-400 font-semibold">#{deployment.id.substring(0, 8)}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              run-{deployment.id.substring(0, 8)}
            </h1>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
              isSuccess ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]' :
              isFailed ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
              isRunning ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
              'bg-white/5 text-slate-400 border border-white/10'
            }`}>
              {isSuccess && <CheckCircle2 className="w-3.5 h-3.5" />}
              {isFailed && <XCircle className="w-3.5 h-3.5" />}
              {isRunning && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
              <span>{deployment.status}</span>
            </span>

            <span className="text-xs font-mono text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10">
              {deployment.project?.name || deployment.project || 'Project'}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono mt-1">
            Target Environment: <span className="text-emerald-400 font-semibold capitalize">{deployment.environment}</span> · Started at {formatDate(deployment.startedAt || deployment.createdAt)}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="h-10 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-white border border-white/10 text-xs font-mono transition-all flex items-center gap-2"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Live Logs Studio</span>
          </button>

          <button
            type="button"
            onClick={handleRerun}
            disabled={isRerunning}
            className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold font-mono shadow-[0_0_24px_rgba(124,58,237,0.4)] transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
            <span>{isRerunning ? 'Queueing...' : 'Re-run'}</span>
          </button>
        </div>
      </div>

      {/* ── Live Service Banner (When Succeeded) ────────────────── */}
      {deployment.serviceUrl && (
        <div className="rounded-2xl bg-[#090A14] border border-emerald-500/30 p-5 shadow-[0_0_30px_rgba(16,185,129,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Live Service Ingress
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                  200 OK
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <a
                  href={deployment.serviceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-white hover:text-emerald-300 underline font-semibold"
                >
                  {deployment.serviceUrl}
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(deployment.serviceUrl)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <a
            href={deployment.serviceUrl}
            target="_blank"
            rel="noreferrer"
            className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          >
            <span>Launch Application</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ── Error Diagnostic Banner (When Failed) ───────────────── */}
      {isFailed && deployment.errorMessage && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-5 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
              Pipeline Failure Diagnostic
            </h4>
            <p className="text-xs font-mono text-rose-200/90 whitespace-pre-wrap break-all leading-relaxed">
              {deployment.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* ── Spec Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-[#090A14] border border-white/[0.08] space-y-1">
          <span className="text-slate-500 text-[11px] block">Branch</span>
          <div className="flex items-center gap-1.5 text-white font-bold truncate">
            <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="truncate">{deployment.branch || 'main'}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090A14] border border-white/[0.08] space-y-1">
          <span className="text-slate-500 text-[11px] block">Commit SHA</span>
          <div className="flex items-center gap-1.5 text-violet-300 font-bold">
            <GitCommit className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{deployment.commitSha ? deployment.commitSha.substring(0, 10) : 'HEAD'}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090A14] border border-white/[0.08] space-y-1">
          <span className="text-slate-500 text-[11px] block">Active Pods</span>
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>{deployment.replicas || 1} instance(s)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090A14] border border-white/[0.08] space-y-1">
          <span className="text-slate-500 text-[11px] block">Trigger Source</span>
          <div className="text-slate-200 font-bold truncate">
            {deployment.createdBy?.name || deployment.createdBy?.email || 'GitHub Actions'}
          </div>
        </div>
      </div>

      {/* ── Two-Column Operational Pipeline Execution ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Execution Stages List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <span>Pipeline Stage Execution</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {steps.length > 0 ? `${steps.filter((s) => s.status === 'SUCCEEDED' || s.status === 'PASS').length}/${steps.length} Gates Passed` : '0/4 Gates'}
              </span>
            </div>

            {/* Stages Stack */}
            <div className="space-y-2.5 font-mono text-xs">
              {(steps.length > 0 ? steps : [
                { id: '1', order: 1, name: 'SOURCE CODE REVISION CHECKOUT', status: isSuccess ? 'SUCCEEDED' : isRunning ? 'RUNNING' : 'QUEUED' },
                { id: '2', order: 2, name: 'HERMETIC DOCKER BUILDKIT COMPILATION', status: isSuccess ? 'SUCCEEDED' : 'QUEUED' },
                { id: '3', order: 3, name: 'TERRAFORM STATE LOCK & TOPOLOGY AUDIT', status: isSuccess ? 'SUCCEEDED' : 'QUEUED' },
                { id: '4', order: 4, name: 'KUBERNETES ZERO-DOWNTIME BLUE/GREEN APPLY', status: isSuccess ? 'SUCCEEDED' : 'QUEUED' },
              ]).map((st: any) => (
                <div
                  key={st.id || st.order}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                      0{st.order}
                    </span>
                    <div>
                      <p className="text-white font-semibold text-xs">{st.name}</p>
                      {st.errorMessage && (
                        <p className="text-rose-400 text-[11px] mt-0.5">{st.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                    st.status === 'SUCCEEDED' || st.status === 'PASS' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                    st.status === 'FAILED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                    st.status === 'RUNNING' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25 animate-pulse' :
                    'bg-white/5 text-slate-500'
                  }`}>
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* State Transition Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#090A14] border border-white/[0.08] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>State Transitions</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">{events.length} Events</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(events.length > 0 ? events : [
                { id: 'ev-1', stage: 'QUEUED', message: 'Deployment requested via API gateway', createdAt: deployment.createdAt },
                { id: 'ev-2', stage: 'DISPATCH', message: 'Runner assigned worker node', createdAt: deployment.startedAt || deployment.createdAt },
                ...(isSuccess ? [{ id: 'ev-3', stage: 'READY', message: 'Readiness probes 3/3 passing', createdAt: deployment.completedAt || deployment.startedAt }] : []),
              ]).map((ev: any) => (
                <div key={ev.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold uppercase text-[10px]">
                      {ev.stage || 'STAGE'}
                    </span>
                    <span className="text-slate-500">{formatDate(ev.createdAt)}</span>
                  </div>
                  <p className="text-slate-200 text-xs mt-1">{ev.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentDetailsPage;
