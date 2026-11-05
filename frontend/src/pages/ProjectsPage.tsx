import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  Terminal,
  FilterX,
  FolderX,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { PageId } from '../types';
import { projectsApi, Project } from '../services/api';

interface ProjectsPageProps {
  onNavigate: (page: PageId) => void;
  onSelectProject?: (project: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onNavigate,
  onSelectProject,
  onShowToast,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { projects: list } = await projectsApi.list();
      setProjects(list || []);
    } catch (err: any) {
      onShowToast?.('error', 'Load Failed', err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.githubRepoFullName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (project: Project) => {
    if (onSelectProject) {
      onSelectProject(project);
    }
    onNavigate('project-details');
  };

  const renderStatusBadge = (status: string | undefined | null) => {
    switch ((status || '').toUpperCase()) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Succeeded</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Queued</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#A1A1B5]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
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
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Projects</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#A1A1B5]">
              {isLoading ? '…' : filteredProjects.length}
            </span>
          </div>
          <p className="text-sm text-[#A1A1B5]">Manage your repositories and continuous delivery pipelines.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 sm:w-64 h-10 pl-10 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={fetchProjects}
            disabled={isLoading}
            className="h-10 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-[#A1A1B5] hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_4px_28px_0_rgba(139,92,246,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 z-10">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mb-3" />
          <p className="text-sm text-[#A1A1B5]">Loading projects…</p>
        </div>
      )}

      {/* Zero projects empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 shadow-xl p-12 flex flex-col items-center text-center z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5] mb-4">
            <FolderX className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-sm text-[#A1A1B5] mb-6 max-w-xs">
            Create your first project to start building and deploying pipelines.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </button>
        </div>
      )}

      {/* Projects Table */}
      {!isLoading && projects.length > 0 && (
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden z-10">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5] bg-white/[0.02] border-b border-white/5">
                  <th className="py-3.5 px-6">Project</th>
                  <th className="py-3.5 px-4">Environment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Deployment</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#A1A1B5]">
                        <FilterX className="w-6 h-6" />
                        <span className="text-sm font-medium text-white">No projects match your search.</span>
                        <span className="text-xs">Try adjusting your search query.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-violet-300 group-hover:border-violet-500/40 transition-colors">
                            <Terminal className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm group-hover:text-violet-300 transition-colors">
                              {p.name}
                            </div>
                            <div className="font-mono text-xs text-[#A1A1B5]">
                              {p.githubRepoFullName || p.repositoryUrl || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-white/[0.04] text-[#A1A1B5] border border-white/5 capitalize">
                          {p.defaultEnvironment}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {p.latestDeployment
                          ? renderStatusBadge(p.latestDeployment.status)
                          : renderStatusBadge(p.setupStatus)}
                      </td>
                      <td className="py-4 px-4 text-[#A1A1B5]">
                        {p.latestDeployment ? (
                          <div className="inline-flex items-center gap-2">
                            {renderStatusBadge(p.latestDeployment.status)}
                            <span>{formatDate(p.latestDeployment.createdAt)}</span>
                          </div>
                        ) : (
                          <span className="text-[#A1A1B5]">No deployments yet</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <ChevronRight className="w-5 h-5 text-[#A1A1B5] group-hover:text-violet-300 group-hover:translate-x-1 transition-all inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
