import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FolderGit2,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { PageId } from '../types';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface NewProjectPageProps {
  onNavigate: (page: PageId) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface RepoOption {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
}

const AVAILABLE_REPOS: RepoOption[] = [
  {
    id: 'repo-1',
    name: 'api-gateway',
    fullName: 'automated-devops/api-gateway',
    isPrivate: true,
    defaultBranch: 'main',
    updatedAt: '12 min ago',
  },
  {
    id: 'repo-2',
    name: 'auth-service',
    fullName: 'automated-devops/auth-service',
    isPrivate: false,
    defaultBranch: 'main',
    updatedAt: '2 hours ago',
  },
  {
    id: 'repo-3',
    name: 'payment-worker',
    fullName: 'automated-devops/payment-worker',
    isPrivate: true,
    defaultBranch: 'main',
    updatedAt: '1 day ago',
  },
  {
    id: 'repo-4',
    name: 'monitoring-hub',
    fullName: 'automated-devops/monitoring-hub',
    isPrivate: false,
    defaultBranch: 'main',
    updatedAt: '3 days ago',
  },
  {
    id: 'repo-5',
    name: 'frontend-app',
    fullName: 'automated-devops/frontend-app',
    isPrivate: true,
    defaultBranch: 'main',
    updatedAt: '5 days ago',
  },
];

export const NewProjectPage: React.FC<NewProjectPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isGitHubConnected, setIsGitHubConnected] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<RepoOption>(AVAILABLE_REPOS[0]);
  const [repoSearch, setRepoSearch] = useState('');

  // Configuration fields
  const [projectName, setProjectName] = useState(AVAILABLE_REPOS[0].name);
  const [environment, setEnvironment] = useState<'Development' | 'Staging' | 'Production'>('Development');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [outputDirectory, setOutputDirectory] = useState('dist');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '8080' },
  ]);

  const [isDeploying, setIsDeploying] = useState(false);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  const handleSelectRepo = (repo: RepoOption) => {
    setSelectedRepo(repo);
    setProjectName(repo.name);
  };

  const handleCompleteDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      onShowToast('success', 'Project Deployed', `Pipeline initialized for ${projectName}!`);
      onNavigate('deployments');
    }, 1200);
  };

  const filteredRepos = AVAILABLE_REPOS.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-5xl mx-auto flex flex-col gap-8 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to projects</span>
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create New Project</h1>
          <p className="text-sm text-[#A1A1B5]">Connect a repository and configure automated pipeline deployment.</p>
        </div>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
        {[
          { step: 1, label: '1. Connect GitHub', desc: 'OAuth Authorization' },
          { step: 2, label: '2. Select Repository', desc: 'Choose source code' },
          { step: 3, label: '3. Configure', desc: 'Build & Environment' },
          { step: 4, label: '4. Review & Deploy', desc: 'Summary check' },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step as WizardStep)}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                isActive
                  ? 'bg-violet-600/20 border-violet-500/50 shadow-[0_0_20px_-4px_rgba(139,92,246,0.3)]'
                  : isDone
                  ? 'bg-white/[0.04] border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isActive ? 'text-violet-300' : isDone ? 'text-emerald-400' : 'text-[#A1A1B5]'}`}>
                  {s.label}
                </span>
                {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-[#A1A1B5]">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* STEP 1: Connect GitHub (Screen 10) */}
      {currentStep === 1 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">GitHub Integration</h2>
              <p className="text-xs text-[#A1A1B5]">Connect your organization or personal account to access repositories.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Connected State Card */}
            <div className={`p-5 rounded-2xl border transition-all ${isGitHubConnected ? 'bg-violet-600/10 border-violet-500/40 ring-1 ring-violet-500/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                    octo
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">automated-devops</p>
                    <p className="text-[11px] text-[#A1A1B5]">GitHub Organization</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-[#A1A1B5] mb-4">
                Access granted for 24 repositories across development, staging, and production clusters.
              </p>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue with this account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Session Expired / Reconnect Variant Card (from Stitch) */}
            <div className="p-5 rounded-2xl bg-[#1B1B26]/60 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Authorization Notice
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    Read-only Scope
                  </span>
                </div>
                <p className="text-xs text-[#A1A1B5] leading-relaxed">
                  Deployment Platform only requests read-only repository permissions. Webhook events trigger automated builds.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGitHubConnected(true);
                    onShowToast('info', 'GitHub Synced', 'Refreshed active OAuth authorizations.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10"
                >
                  <RefreshCw className="w-3 h-3 text-[#A1A1B5]" />
                  <span>Refresh permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Select Repository (Screen 11) */}
      {currentStep === 2 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-bold text-white">Select Repository</h2>
              <p className="text-xs text-[#A1A1B5]">Choose the Git repository you want to link to this project.</p>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-56 h-9 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepos.map((repo) => {
              const isSelected = selectedRepo.id === repo.id;
              return (
                <div
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-violet-600/15 border-violet-500/50 ring-1 ring-violet-500/30'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 className={`w-5 h-5 ${isSelected ? 'text-violet-300' : 'text-[#A1A1B5]'}`} />
                      <div>
                        <p className="text-sm font-semibold text-white">{repo.name}</p>
                        <p className="text-xs font-mono text-[#A1A1B5]">{repo.fullName}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#A1A1B5]">
                      {repo.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[#A1A1B5]">
                    <span>Branch: <code className="text-violet-300">{repo.defaultBranch}</code></span>
                    <span>Updated {repo.updatedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl text-xs text-[#A1A1B5] hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 flex items-center gap-2"
            >
              <span>Continue to Configure</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Configure Project (Screen 12) */}
      {currentStep === 3 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configure Build &amp; Environment</h2>
              <p className="text-xs text-[#A1A1B5]">Set deployment targets, commands, and secure secret variables.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                Environment Target
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="Development">Development (Cluster alpha-1)</option>
                <option value="Staging">Staging (Cluster beta-us-east)</option>
                <option value="Production">Production (Cluster prod-multi-region)</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                Build Command
              </label>
              <input
                type="text"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                Output Directory
              </label>
              <input
                type="text"
                value={outputDirectory}
                onChange={(e) => setOutputDirectory(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Environment Variables Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white">Environment Variables</span>
              <button
                type="button"
                onClick={handleAddEnvVar}
                className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variable</span>
              </button>
            </div>

            <div className="space-y-2">
              {envVars.map((ev, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={ev.key}
                    onChange={(e) => handleEnvVarChange(idx, 'key', e.target.value)}
                    className="flex-1 h-9 px-3 bg-[#0A0A12] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="VALUE"
                    value={ev.value}
                    onChange={(e) => handleEnvVarChange(idx, 'value', e.target.value)}
                    className="flex-1 h-9 px-3 bg-[#0A0A12] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEnvVar(idx)}
                    className="p-2 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl text-xs text-[#A1A1B5] hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 flex items-center gap-2"
            >
              <span>Continue to Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Deploy (Screen 13) */}
      {currentStep === 4 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Review Project Specification</h2>
              <p className="text-xs text-[#A1A1B5]">Confirm your pipeline setup before launching container provision.</p>
            </div>
          </div>

          {/* Specification Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Project Name</p>
              <p className="text-sm font-bold text-white mt-0.5">{projectName}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Repository</p>
              <p className="text-xs font-mono text-violet-300 mt-0.5 truncate">{selectedRepo.fullName}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Environment</p>
              <p className="text-xs font-medium text-emerald-400 mt-0.5">{environment}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Branch</p>
              <p className="text-xs font-mono text-white mt-0.5">{selectedRepo.defaultBranch}</p>
            </div>
          </div>

          {/* Build Pipeline Plan */}
          <div className="p-4 rounded-xl bg-[#09090F] border border-white/5 font-mono text-xs space-y-2 text-[#A1A1B5]">
            <p className="text-white font-semibold text-[11px] uppercase tracking-wider font-sans">
              Deployment Pipeline Blueprint:
            </p>
            <p>1. Git checkout <span className="text-violet-300">{selectedRepo.fullName}</span> ({selectedRepo.defaultBranch})</p>
            <p>2. Execute build command: <code className="text-sky-300">{buildCommand}</code></p>
            <p>3. Archive artifact output: <code className="text-sky-300">{outputDirectory}</code></p>
            <p>4. Inject {envVars.length} runtime environment variables</p>
            <p>5. Provision Kubernetes Deployment &amp; ingress route</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl text-xs text-[#A1A1B5] hover:text-white"
            >
              Back to configuration
            </button>
            <button
              type="button"
              onClick={handleCompleteDeploy}
              disabled={isDeploying}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 text-white text-xs font-bold shadow-[0_4px_24px_-4px_rgba(139,92,246,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Provisioning Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Deploy Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default NewProjectPage;
