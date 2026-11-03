import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  GitBranch,
  GitCommit,
  RotateCcw,
  Terminal,
  XCircle,
  Play,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PageId, DeploymentRecord, PipelineStage } from '../types';

interface DeploymentDetailsPageProps {
  deployment?: DeploymentRecord;
  onNavigate: (page: PageId) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const DEFAULT_DEPLOYMENT: DeploymentRecord = {
  id: '#27',
  project: 'payment-worker',
  environment: 'Development',
  status: 'Failed',
  startedAt: '48 min ago',
  branch: 'fix/stripe-webhook',
  commitHash: '41fe829',
  commitMessage: 'fix: parse raw body for signature verification',
  author: 'Taylor Chen',
  duration: '2m 14s',
  errorDetails: 'Pod payment-worker-6f987d65f-kq92l in CrashLoopBackOff. Deployment timeout threshold exceeded (300s).',
};

const STAGES: PipelineStage[] = [
  { id: 'stg-1', stepNumber: 1, name: 'Source Checkout', status: 'completed', duration: '4s' },
  { id: 'stg-2', stepNumber: 2, name: 'Dependency Resolution', status: 'completed', duration: '18s' },
  { id: 'stg-3', stepNumber: 3, name: 'Build & Compile', status: 'completed', duration: '42s' },
  { id: 'stg-4', stepNumber: 4, name: 'Security & Linting', status: 'completed', duration: '25s' },
  { id: 'stg-5', stepNumber: 5, name: 'Dockerize & Push', status: 'completed', duration: '35s' },
  { id: 'stg-6', stepNumber: 6, name: 'Kubernetes Deploy', status: 'failed', duration: '10s' },
];

export const DeploymentDetailsPage: React.FC<DeploymentDetailsPageProps> = ({
  deployment = DEFAULT_DEPLOYMENT,
  onNavigate,
  onShowToast,
}) => {
  const handleRerun = () => {
    onShowToast?.('info', 'Re-run Triggered', `Re-executing pipeline for deployment ${deployment.id}...`);
    onNavigate('deployment-logs');
  };

  const handleRollback = () => {
    onShowToast?.('success', 'Rollback Initialized', 'Targeting last healthy release #25 (web-client / payment-worker).');
  };

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
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Deployment {deployment.id}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{deployment.status}</span>
            </span>
            <span className="font-mono text-xs text-[#A1A1B5] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
              {deployment.project}
            </span>
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Triggered by <span className="text-white font-medium">{deployment.author}</span> · {deployment.startedAt} · Duration: {deployment.duration}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRollback}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Rollback</span>
          </button>

          <button
            type="button"
            onClick={handleRerun}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Re-run Pipeline</span>
          </button>
        </div>
      </div>

      {/* Commit & Pipeline Metadata Card */}
      <div className="p-5 rounded-2xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 z-10 text-xs">
        <div>
          <span className="font-mono uppercase text-[#A1A1B5] text-[10px]">Commit Hash</span>
          <div className="flex items-center gap-1.5 mt-1">
            <GitCommit className="w-3.5 h-3.5 text-violet-400" />
            <code className="text-white font-mono">{deployment.commitHash}</code>
          </div>
        </div>

        <div>
          <span className="font-mono uppercase text-[#A1A1B5] text-[10px]">Target Branch</span>
          <div className="flex items-center gap-1.5 mt-1">
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-white font-mono">{deployment.branch}</span>
          </div>
        </div>

        <div>
          <span className="font-mono uppercase text-[#A1A1B5] text-[10px]">Target Cluster</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-mono">us-east-prod-01</span>
          </div>
        </div>

        <div>
          <span className="font-mono uppercase text-[#A1A1B5] text-[10px]">Total Execution Time</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-white font-mono">{deployment.duration}</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline DAG Flow (Matching Stitch DAG stages) */}
      <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Pipeline Execution Graph</h2>
            <p className="text-xs text-[#A1A1B5]">Directed stage graph executed on runner worker-node-88.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-white"
          >
            <span>View Raw Logs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Stage Nodes in Responsive Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {STAGES.map((stg) => {
            const isCompleted = stg.status === 'completed';
            const isFailed = stg.status === 'failed';
            return (
              <div
                key={stg.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  isFailed
                    ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20'
                    : isCompleted
                    ? 'bg-white/[0.03] border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-[#A1A1B5]">
                    0{stg.stepNumber}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>

                <div>
                  <p className="text-xs font-semibold text-white leading-tight">{stg.name}</p>
                  <p className="text-[11px] font-mono text-[#A1A1B5] mt-1">{stg.duration}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Diagnostic Panel (From Screen 18) */}
        {deployment.errorDetails && deployment.errorDetails !== '-' && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Failure Diagnostic — Stage 06 Kubernetes Deploy</span>
            </div>
            <p className="font-mono text-xs text-rose-200 leading-relaxed pl-6">
              {deployment.errorDetails}
            </p>
            <div className="pl-6 pt-1 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('deployment-logs')}
                className="text-white underline hover:text-rose-200"
              >
                Inspect stack trace in terminal logs →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Preview Snippet */}
      <div className="rounded-3xl bg-[#09090F] border border-white/10 p-5 font-mono text-xs text-gray-300 space-y-1.5 shadow-2xl z-10">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 font-sans">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white">Log Stream Summary</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('deployment-logs')}
            className="text-xs text-violet-300 hover:text-white"
          >
            Open Interactive Console
          </button>
        </div>

        <p className="text-gray-500">14:26:20 [controller] Initiating deployment rollout for pod payment-worker...</p>
        <p className="text-emerald-400">14:26:22 [build] Container image pushed: registry.devops.internal/payment-worker:41fe829</p>
        <p className="text-rose-400">14:26:25 WARN [readinessProbe] HTTP GET http://10.244.2.84:8080/healthz failed: 503 Service Unavailable</p>
        <p className="text-rose-400">14:26:38 ERROR [runtime] UnhandledPromiseRejection: ConnectionRefused at RedisPool.connect</p>
        <p className="text-rose-500 font-bold">14:26:45 [controller] Pod in CrashLoopBackOff. Deployment timeout threshold exceeded (300s).</p>
      </div>
    </div>
  );
};
export default DeploymentDetailsPage;
