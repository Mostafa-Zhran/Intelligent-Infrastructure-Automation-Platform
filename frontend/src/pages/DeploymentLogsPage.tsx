import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Terminal,
  Search,
} from 'lucide-react';
import { PageId, LogLine } from '../types';

interface DeploymentLogsPageProps {
  onNavigate: (page: PageId) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const SAMPLE_LOGS: LogLine[] = [
  { id: '1', lineNumber: 480, timestamp: '14:26:01', level: 'INFO', message: '[runner] Job accepted by runner node pool worker-node-88 (k8s-us-east)' },
  { id: '2', lineNumber: 481, timestamp: '14:26:02', level: 'INFO', message: '[git] Cloning automated-devops/payment-worker repository at branch fix/stripe-webhook' },
  { id: '3', lineNumber: 482, timestamp: '14:26:04', level: 'INFO', message: '[git] Head commit: 41fe829 "fix: parse raw body for signature verification"' },
  { id: '4', lineNumber: 483, timestamp: '14:26:06', level: 'INFO', message: '[build] Setting up Node.js v20.12.0 runtime environment' },
  { id: '5', lineNumber: 484, timestamp: '14:26:10', level: 'INFO', message: '[deps] Restoring npm cache from key npm-linux-x64-41fe829' },
  { id: '6', lineNumber: 485, timestamp: '14:26:14', level: 'INFO', message: '[deps] Dependencies resolved in 3.8s. 0 vulnerabilities found.' },
  { id: '7', lineNumber: 486, timestamp: '14:26:18', level: 'INFO', message: '[compile] Executing `npm run build` -> emitting production bundle to ./dist' },
  { id: '8', lineNumber: 487, timestamp: '14:26:22', level: 'INFO', message: '[docker] Building multi-stage container image: payment-worker:41fe829' },
  { id: '9', lineNumber: 488, timestamp: '14:26:25', level: 'INFO', message: '[docker] Successfully pushed image to registry.devops.internal (digest: sha256:d8b2e1f)' },
  { id: '10', lineNumber: 489, timestamp: '14:26:27', level: 'INFO', message: '[k8s] Applying manifest: deployment/payment-worker in namespace: development' },
  { id: '11', lineNumber: 490, timestamp: '14:26:29', level: 'RUNTIME', message: 'RUNTIME Listening on 0.0.0.0:8080. Initializing upstream Redis pool (size=64)...' },
  { id: '12', lineNumber: 491, timestamp: '14:26:33', level: 'WARN', message: 'WARN [readinessProbe] HTTP GET http://10.244.2.84:8080/healthz failed: 503 Service Unavailable' },
  { id: '13', lineNumber: 492, timestamp: '14:26:38', level: 'WARN', message: 'WARN [readinessProbe] HTTP GET http://10.244.2.84:8080/healthz failed: 503 Service Unavailable (attempt 2/3)' },
  { id: '14', lineNumber: 493, timestamp: '14:26:42', level: 'ERROR', message: 'ERROR [runtime] UnhandledPromiseRejection: ConnectionRefused at RedisPool.connect(redis-cluster-primary:6379)' },
  { id: '15', lineNumber: 494, timestamp: '14:26:44', level: 'FATAL', message: 'FATAL Process terminated with exit code 1. Container crashed.' },
  { id: '16', lineNumber: 495, timestamp: '14:26:45', level: 'ERROR', message: '[controller] Pod payment-worker-6f987d65f-kq92l in CrashLoopBackOff. Deployment timeout threshold exceeded (300s).' },
];

export const DeploymentLogsPage: React.FC<DeploymentLogsPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [logs] = useState<LogLine[]>(SAMPLE_LOGS);
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const rawText = logs.map((l) => `${l.lineNumber}  ${l.timestamp}  ${l.message}`).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    onShowToast?.('success', 'Logs Copied', 'All log entries copied to your clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const rawText = logs.map((l) => `${l.lineNumber}  ${l.timestamp}  ${l.message}`).join('\n');
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment-27-logs.txt';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('info', 'Download Started', 'Downloaded deployment-27-logs.txt');
  };

  const filteredLogs = logs.filter((l) => {
    const matchesLevel = levelFilter === 'ALL' || l.level === levelFilter;
    const matchesSearch = l.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLineStyle = (level?: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'text-rose-400 bg-rose-950/20';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/15';
      case 'RUNTIME':
        return 'text-sky-300';
      default:
        return 'text-gray-300';
    }
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
            onClick={() => onNavigate('deployment-details')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to deployment #27</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Deployment Logs</h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 text-xs font-mono border border-sky-500/30 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>Live Console</span>
            </div>
            <span className="text-xs font-mono text-[#A1A1B5] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
              #27 · payment-worker
            </span>
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Real-time streaming telemetry and build execution output from cluster runner node.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#A1A1B5]" />}
            <span>{copied ? 'Copied' : 'Copy logs'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#A1A1B5]" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
              autoScroll
                ? 'bg-violet-600/20 text-white border-violet-500/40'
                : 'bg-white/[0.04] text-[#A1A1B5] border-white/10'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-violet-400 animate-pulse' : 'bg-gray-500'}`} />
            <span>Auto-scroll</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Console (Stitch Section 1) */}
      <div className="rounded-3xl bg-[#09090F] border border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden z-10 flex flex-col">
        {/* Terminal Header Toolbar */}
        <div className="p-3.5 bg-[#12121B] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-xs font-mono text-[#A1A1B5] ml-2">runner@k8s-us-east: ~/build</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                    levelFilter === lvl
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-[#A1A1B5] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-gray-500 absolute left-2.5" />
              <input
                type="text"
                placeholder="Search log lines..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-40 h-7 pl-7 pr-2 text-xs bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Log Terminal Lines */}
        <div
          ref={terminalRef}
          className="p-5 font-mono text-[13px] leading-relaxed h-[420px] overflow-y-auto space-y-1.5 select-text"
        >
          {filteredLogs.map((l) => (
            <div key={l.id} className={`flex items-start gap-4 px-2 py-0.5 rounded transition-colors ${getLineStyle(l.level)}`}>
              <span className="text-[#A1A1B5] w-9 text-right select-none shrink-0 font-mono text-xs opacity-60">
                {l.lineNumber}
              </span>
              <span className="text-[#A1A1B5] select-none shrink-0 font-mono text-xs opacity-70">
                {l.timestamp}
              </span>
              <span className="break-all font-mono">
                {l.message}
              </span>
            </div>
          ))}

          {/* Terminal live prompt line with blinking block */}
          <div className="flex items-center gap-3 pt-2 px-2 text-sky-400">
            <span className="w-9 text-right font-mono text-xs text-[#A1A1B5] opacity-60">496</span>
            <span className="font-mono text-xs text-[#A1A1B5] opacity-70">14:26:48</span>
            <span className="text-gray-400">Waiting for next container rollout signal...</span>
            <span className="inline-block w-2 h-4 bg-sky-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stitch Section 2: Compact Running State Preview */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#13131F]/60 backdrop-blur-xl border border-white/10 p-6 z-10 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A1A1B5]">
            Live Compact Preview (Running State)
          </span>
          <span className="text-xs text-sky-300 font-mono">Building Docker image...</span>
        </div>

        <div className="bg-[#09090F] border border-white/5 rounded-xl p-4 font-mono text-xs text-gray-300 space-y-1 h-28 overflow-y-auto">
          <p className="text-[#A1A1B5]">10:45:00  Deployment #30 started (inventory-service)</p>
          <p className="text-[#A1A1B5]">10:45:02  Cloning repository at release/v1.4</p>
          <p className="text-sky-300">10:45:08  Building Docker container image layers [3/7]...</p>
          <p className="text-sky-400 font-semibold animate-pulse">10:45:25  Pushing image to registry...</p>
        </div>
      </div>

      {/* Stitch Section 3: No Logs Yet Variant Card */}
      <div className="rounded-2xl bg-[#13131F]/40 border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-2 text-[#A1A1B5] z-10">
        <Terminal className="w-8 h-8 text-[#A1A1B5] mb-1 opacity-70" />
        <span className="text-sm font-semibold text-white">No logs recorded yet (Queued Stage)</span>
        <p className="text-xs max-w-sm text-[#A1A1B5]">
          Logs will stream here automatically as soon as runner node starts executing stage 01.
        </p>
      </div>
    </div>
  );
};
export default DeploymentLogsPage;
