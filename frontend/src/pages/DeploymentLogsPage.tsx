import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Terminal,
  Search,
  RefreshCw,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { PageId } from '../types';
import { deploymentsApi } from '../services/api';

interface LogLine {
  id: string;
  lineNumber: number;
  timestamp: string;
  level: string;
  message: string;
}

interface DeploymentLogsPageProps {
  deployment?: any;
  onNavigate: (page: PageId) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DeploymentLogsPage: React.FC<DeploymentLogsPageProps> = ({
  deployment,
  onNavigate,
  onShowToast,
}) => {
  const [activeDeployment, setActiveDeployment] = useState<any>(() => {
    if (deployment) return deployment;
    try {
      const cached = localStorage.getItem('iiap_selected_deployment');
      return cached ? JSON.parse(cached) : undefined;
    } catch {
      return undefined;
    }
  });

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (deployment) {
      setActiveDeployment(deployment);
      try {
        localStorage.setItem('iiap_selected_deployment', JSON.stringify(deployment));
      } catch {}
    } else if (!activeDeployment) {
      // Auto-load most recent deployment if none selected
      deploymentsApi
        .list({ per_page: 1 })
        .then((res: { deployments: any[] }) => {
          if (res.deployments && res.deployments.length > 0) {
            setActiveDeployment(res.deployments[0]);
            try {
              localStorage.setItem('iiap_selected_deployment', JSON.stringify(res.deployments[0]));
            } catch {}
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [deployment]);

  const deploymentId = activeDeployment?.id;

  useEffect(() => {
    if (!deploymentId) return;
    fetchLogs();
    let interval: any;
    if (activeDeployment?.status === 'RUNNING' || activeDeployment?.status === 'QUEUED') {
      interval = setInterval(fetchLogs, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deploymentId, activeDeployment?.status]);

  const fetchLogs = async (silent = false) => {
    if (!deploymentId) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await deploymentsApi.getLogs(deploymentId, { limit: 500 });
      setLastSyncTime(new Date().toLocaleTimeString());
      if (data.logs && data.logs.length > 0) {
        const mapped: LogLine[] = data.logs.map((l: any, idx: number) => ({
          id: l.id || String(idx),
          lineNumber: idx + 1,
          timestamp: new Date(l.loggedAt).toLocaleTimeString(),
          level: l.level || 'INFO',
          message: l.message,
        }));
        setLogs(mapped);
      } else {
        // If no DB logs yet, provide connection stream banner
        setLogs([
          {
            id: 'init-1',
            lineNumber: 1,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: `[stream] Connecting to execution runner for deployment #${deploymentId.substring(0, 8)}`,
          },
          {
            id: 'init-2',
            lineNumber: 2,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: `[status] Cluster Status: ${activeDeployment?.status || 'QUEUED'}. Awaiting runner telemetry buffers...`,
          },
          {
            id: 'init-3',
            lineNumber: 3,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: `[k8s] Provisioning dynamic NodePort endpoint in cluster security perimeter...`,
          },
        ]);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      const matchesLevel =
        levelFilter === 'ALL' || line.level.toUpperCase() === levelFilter.toUpperCase();
      const matchesSearch =
        line.message.toLowerCase().includes(logSearch.toLowerCase()) ||
        line.timestamp.includes(logSearch);
      return matchesLevel && matchesSearch;
    });
  }, [logs, levelFilter, logSearch]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast?.('success', 'Logs Copied', 'Console buffer copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${deploymentId ? deploymentId.substring(0, 8) : 'logs'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('info', 'Download Started', 'Log stream file exported.');
  };

  const renderStatusPill = (status?: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-300">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/5 border border-white/10 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#07080E] text-slate-100 flex flex-col">
      {/* ── Top Command Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#090A12]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate(activeDeployment ? 'deployment-details' : 'deployments')}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Return to deployment details"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-violet-400" />
                  <span>Execution Console Stream</span>
                </h1>
                {activeDeployment?.id && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/[0.04] border border-white/10 text-violet-300">
                    #{activeDeployment.id.substring(0, 8)}
                  </span>
                )}
                {renderStatusPill(activeDeployment?.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Workload: <span className="text-slate-200 font-medium">{activeDeployment?.project?.name || activeDeployment?.projectName || 'Container Workload'}</span> · Branch: <span className="text-violet-400">{activeDeployment?.branch || 'main'}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {activeDeployment?.serviceUrl && (
              <a
                href={activeDeployment.serviceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Open App</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              type="button"
              onClick={() => fetchLogs(false)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Buffer'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Terminal Studio ───────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4 flex-1 flex flex-col">
        {/* Terminal Window Frame */}
        <div className="rounded-2xl bg-[#090A10] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col flex-1 min-h-[68vh]">
          {/* Terminal Toolbar */}
          <div className="px-4 py-3 bg-[#0D0E17] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2">
                stdout / stderr runner buffer
              </span>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                ({filteredLogs.length} lines)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Level Filter Chips */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
                {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      levelFilter === lvl
                        ? 'bg-violet-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* In-Line Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Grep logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-36 sm:w-52 h-7 pl-8 pr-2 text-xs bg-black/40 border border-white/10 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Autoscroll Checkbox */}
              <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-violet-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Tail</span>
              </label>
            </div>
          </div>

          {/* Terminal Output Body */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-1 select-text bg-[#07080E]"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
                <span>Connecting live worker output buffer…</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                No log output matched current filter criteria.
              </div>
            ) : (
              filteredLogs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 hover:bg-white/[0.02] py-0.5 px-1 rounded transition-colors">
                  <span className="text-slate-600 select-none w-10 text-right shrink-0 tabular-nums">
                    {l.lineNumber}
                  </span>
                  <span className="text-slate-500 select-none shrink-0 tabular-nums">
                    {l.timestamp}
                  </span>
                  <span
                    className={`select-none shrink-0 text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      l.level === 'ERROR' || l.level === 'FATAL'
                        ? 'text-rose-400 bg-rose-500/10'
                        : l.level === 'WARN'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-sky-400 bg-sky-500/10'
                    }`}
                  >
                    {l.level}
                  </span>
                  <span className="text-slate-200 whitespace-pre-wrap break-all flex-1 leading-relaxed">
                    {l.message}
                  </span>
                </div>
              ))
            )}

            {/* Active streaming cursor */}
            {!isLoading && (
              <div className="flex items-center gap-2 pt-2 text-slate-600">
                <span className="w-2 h-3.5 bg-violet-400 animate-pulse inline-block" />
                <span className="text-[11px] font-mono text-slate-600">tail stream active · {lastSyncTime}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeploymentLogsPage;
