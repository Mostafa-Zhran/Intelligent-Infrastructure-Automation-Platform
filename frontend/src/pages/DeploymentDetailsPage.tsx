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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
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
        <p className="text-sm text-[#A1A1B5]">Loading deployment metrics…</p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">No Deployment Selected</h2>
        <p className="text-sm text-[#A1A1B5] mb-6">Select a deployment from the history table to view details.</p>
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
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('deployments')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to deployments</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              Deployment #{deployment.id.substring(0, 8)}
            </h1>
            {renderStatusBadge(deployment.status)}
            <span className="font-mono text-xs text-[#A1A1B5] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
              {deployment.project?.name || deployment.project || 'Project'}
            </span>
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1 font-mono">
            Environment: <span className="text-emerald-400 capitalize">{deployment.environment}</span> · Triggered {formatDate(deployment.startedAt || deployment.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#A1A1B5]" />
            <span>View Logs</span>
          </button>

          <button
            type="button"
            onClick={handleRerun}
            disabled={isRerunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
            <span>{isRerunning ? 'Queueing...' : 'Re-run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Failure Banner (if failed) */}
      {deployment.status === 'FAILED' && deployment.errorMessage && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex items-start gap-3.5 z-10">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-300">Execution Error Summary</h4>
            <p className="text-xs font-mono text-rose-200/90 whitespace-pre-wrap break-all">
              {deployment.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Telemetry Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">Git Branch</span>
          <div className="flex items-center gap-1.5 mt-2 text-white font-mono text-sm">
            <GitBranch className="w-4 h-4 text-violet-400" />
            <span>{deployment.branch || 'main'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">Commit Reference</span>
          <div className="flex items-center gap-1.5 mt-2 text-white font-mono text-sm">
            <GitCommit className="w-4 h-4 text-violet-400" />
            <span className="text-violet-300">{deployment.commitSha ? deployment.commitSha.substring(0, 10) : 'HEAD'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">Container Replicas</span>
          <div className="flex items-center gap-1.5 mt-2 text-white font-mono text-sm">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>{deployment.replicas || 1} instance(s)</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#13131F]/90 backdrop-blur-xl p-5 border border-white/10">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">Triggered By</span>
          <div className="mt-2 text-white text-sm font-medium truncate">
            {deployment.createdBy?.name || deployment.createdBy?.email || 'System / CI Webhook'}
          </div>
        </div>
      </section>

            {/* Pipeline Steps Section */}
      {steps.length > 0 && (
        <section className="rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 z-10 space-y-4">
          <h3 className="text-sm font-bold text-white">Pipeline Execution Steps</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {steps.map((st: any) => (
              <div key={st.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">#{st.order} {st.name}</span>
                  <span className="text-[10px] text-violet-300 uppercase">{st.status}</span>
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
        <section className="rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 z-10 space-y-4">
          <h3 className="text-sm font-bold text-white">State Transition Milestones</h3>
          <div className="space-y-3 font-mono text-xs">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#A1A1B5] shrink-0 text-[11px]">
                  {formatDate(ev.createdAt)}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {ev.stage || 'STAGE'}
                </span>
                <span className="text-white flex-1">{ev.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DeploymentDetailsPage;
