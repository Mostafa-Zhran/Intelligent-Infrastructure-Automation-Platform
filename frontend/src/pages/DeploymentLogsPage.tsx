import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Terminal,
  Search,
  RefreshCw,
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
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  const deploymentId = deployment?.id;

  useEffect(() => {
    fetchLogs();
    let interval: any;
    if (deployment?.status === 'RUNNING' || deployment?.status === 'QUEUED') {
      interval = setInterval(fetchLogs, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deploymentId, deployment?.status]);

  const fetchLogs = async () => {
    if (!deploymentId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await deploymentsApi.getLogs(deploymentId, { limit: 500 });
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
        // If no DB logs yet, provide connection banner
        setLogs([
          {
            id: 'init-1',
            lineNumber: 1,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: `[stream] Connected to live execution worker for deployment #${deploymentId.substring(0, 8)}`,
          },
          {
            id: 'init-2',
            lineNumber: 2,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: `[status] Current status: ${deployment?.status || 'QUEUED'}. Awaiting worker output buffers...`,
          },
        ]);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((line) => {
    const matchesLevel =
      levelFilter === 'ALL' || line.level.toUpperCase() === levelFilter.toUpperCase();
    const matchesSearch =
      line.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      line.timestamp.includes(logSearch);
    return matchesLevel && matchesSearch;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast?.('success', 'Logs Copied', 'Filtered logs copied to clipboard.');
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
    onShowToast?.('info', 'Download Started', 'Log file downloaded successfully.');
  };

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto flex flex-col gap-6 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate(deployment ? 'deployment-details' : 'deployments')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to deployment</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <Terminal className="w-6 h-6 text-violet-400" />
              <span>Live Console Stream</span>
            </h1>
            {deployment?.id && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-violet-300">
                #{deployment.id.substring(0, 8)}
              </span>
            )}
          </div>
          <p className="text-xs text-[#A1A1B5] mt-1 font-mono">
            {deployment?.project?.name || 'Automated Container Ingress'} · {filteredLogs.length} buffered lines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#A1A1B5]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 text-[#A1A1B5]" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#09090F] border border-white/10 shadow-2xl overflow-hidden z-10 flex flex-col h-[65vh]">
        {/* Terminal Header Toolbar */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#0F0F19] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-xs font-mono text-[#A1A1B5] ml-2">stdout / stderr stream</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 hidden sm:flex">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    levelFilter === lvl
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-white/5 text-[#A1A1B5] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-40 sm:w-56 h-7 pl-8 pr-2 text-xs bg-black/50 border border-white/10 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <label className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1B5] cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-violet-600 focus:ring-0"
              />
              <span>Autoscroll</span>
            </label>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#D1D1DF] space-y-1 select-text"
        >
          {filteredLogs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 hover:bg-white/[0.02] py-0.5 px-1 rounded">
              <span className="text-gray-600 select-none w-10 text-right shrink-0">
                {l.lineNumber}
              </span>
              <span className="text-gray-500 select-none shrink-0">{l.timestamp}</span>
              <span
                className={`select-none shrink-0 text-[10px] px-1 py-0.2 rounded font-bold ${
                  l.level === 'ERROR' || l.level === 'FATAL'
                    ? 'text-rose-400 bg-rose-500/10'
                    : l.level === 'WARN'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-sky-400 bg-sky-500/10'
                }`}
              >
                {l.level}
              </span>
              <span className="text-[#E2E2F0] whitespace-pre-wrap break-all flex-1">
                {l.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeploymentLogsPage;
