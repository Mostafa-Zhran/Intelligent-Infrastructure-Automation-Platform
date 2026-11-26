import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  AlertTriangle,
  Server,
  Zap,
  Eye,
  EyeOff,
  Shield,
  Cpu,
} from 'lucide-react';
import { PageId } from '../types';
import { githubApi, projectsApi, ec2ConfigApi, awsClusterConfigApi, envVarsApi, Project, GitHubRepoOption, GitHubAccountOption, GitHubBranchOption, AnalyzeRepositoryResult } from '../services/api';
import { ProjectIcon } from '../components/common/BrandLogo';

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
  onProjectCreated?: (project: Project) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export const NewProjectPage: React.FC<NewProjectPageProps> = ({
  onNavigate,
  onProjectCreated,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // GitHub integration state
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean>(false);
  const [githubLogin, setGithubLogin] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Repositories & owners state
  const [accounts, setAccounts] = useState<GitHubAccountOption[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [repositories, setRepositories] = useState<GitHubRepoOption[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoOption | null>(null);
  const [repoSearch, setRepoSearch] = useState('');

  // Branches
  const [branches, setBranches] = useState<GitHubBranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);

  // Configuration fields
  const [projectName, setProjectName] = useState('');
  const [environment, setEnvironment] = useState<'Development' | 'Staging' | 'Production'>('Development');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '8080' },
  ]);

  const [isDeploying, setIsDeploying] = useState(false);
  const [dockerfilePath, setDockerfilePath] = useState('Dockerfile');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeRepositoryResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // ── EC2 BYOS configuration state ──
  const [ec2PublicIp, setEc2PublicIp] = useState('');
  const [ec2SshUser, setEc2SshUser] = useState('ubuntu');
  const [ec2SshPort, setEc2SshPort] = useState(22);
  const [ec2SshKey, setEc2SshKey] = useState('');
  const [ec2ShowKey, setEc2ShowKey] = useState(false);
  const [ec2HostPort, setEc2HostPort] = useState(80);
  const [ec2ContainerPort, setEc2ContainerPort] = useState(3000);
  const [ec2AwsRegion, setEc2AwsRegion] = useState('us-east-1');
  const [isSavingEc2, setIsSavingEc2] = useState(false);
  const [isVerifyingEc2, setIsVerifyingEc2] = useState(false);
  const [ec2VerifyResult, setEc2VerifyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [savedProject, setSavedProject] = useState<Project | null>(null);

  // ── Deployment Target Mode (EC2 BYOS vs Cluster Mode BYOC) ──
  const [targetMode, setTargetMode] = useState<'ec2' | 'cluster'>('ec2');
  const [clusterAuthMode, setClusterAuthMode] = useState<'IAM_ROLE' | 'ACCESS_KEYS'>('IAM_ROLE');
  const [clusterRoleArn, setClusterRoleArn] = useState('');
  const [clusterExternalId, setClusterExternalId] = useState('');
  const [clusterAccessKeyId, setClusterAccessKeyId] = useState('');
  const [clusterSecretKey, setClusterSecretKey] = useState('');
  const [clusterRegion, setClusterRegion] = useState('us-east-1');
  const [clusterName, setClusterName] = useState('');
  const [clusterInstanceType, setClusterInstanceType] = useState('t3.medium');
  const [clusterDesiredNodes, setClusterDesiredNodes] = useState(2);
  const [isSavingCluster, setIsSavingCluster] = useState(false);
  const [isVerifyingCluster, setIsVerifyingCluster] = useState(false);
  const [clusterVerifyResult, setClusterVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const runRepositoryAnalysis = async (
    owner: string,
    repo: string,
    branch: string,
    customDockerfilePath: string = dockerfilePath
  ) => {
    setIsAnalyzing(true);
    try {
      const result = await projectsApi.analyzeRepository({
        owner,
        repo,
        branch,
        dockerfilePath: customDockerfilePath.trim() || 'Dockerfile',
      });
      setAnalysisResult(result);
    } catch (err: any) {
      console.warn('Repository analysis note:', err.message);
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Check GitHub integration status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setIsLoadingAuth(true);
    try {
      const status = await githubApi.getStatus();
      setIsGitHubConnected(status.connected);
      if (status.connected && status.githubLogin) {
        setGithubLogin(status.githubLogin);
        loadAccountsAndRepos(status.githubLogin);
      }
    } catch {
      setIsGitHubConnected(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleStartOAuth = async () => {
    setIsConnecting(true);
    try {
      const { authorizationUrl } = await githubApi.startConnect();
      window.location.href = authorizationUrl;
    } catch (err: any) {
      onShowToast('error', 'OAuth Error', err.message || 'Failed to initiate GitHub authorization');
      setIsConnecting(false);
    }
  };

  const loadAccountsAndRepos = async (defaultOwner?: string) => {
    setIsLoadingRepos(true);
    try {
      const orgData = await githubApi.getOrganizations();
      const allAccounts: GitHubAccountOption[] = [
        orgData.account,
        ...(orgData.organizations || []),
      ].filter(Boolean);
      setAccounts(allAccounts);

      const ownerToUse = defaultOwner || orgData.account?.login || '';
      setSelectedOwner(ownerToUse);

      if (ownerToUse) {
        const repoData = await githubApi.getRepositories(ownerToUse);
        setRepositories(repoData.repositories || []);
        if (repoData.repositories?.length > 0) {
          handleSelectRepo(repoData.repositories[0]);
        }
      }
    } catch (err: any) {
      onShowToast('error', 'Repositories Failed', err.message || 'Failed to fetch repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleOwnerChange = async (owner: string) => {
    setSelectedOwner(owner);
    setIsLoadingRepos(true);
    try {
      const repoData = await githubApi.getRepositories(owner);
      setRepositories(repoData.repositories || []);
      if (repoData.repositories?.length > 0) {
        handleSelectRepo(repoData.repositories[0]);
      } else {
        setSelectedRepo(null);
      }
    } catch (err: any) {
      onShowToast('error', 'Load Error', err.message || 'Failed to load repositories for ' + owner);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSelectRepo = async (repo: GitHubRepoOption) => {
    setSelectedRepo(repo);
    setProjectName(repo.name);
    setSelectedBranch(repo.defaultBranch || 'main');

    // Fetch live branches
    setIsLoadingBranches(true);
    const owner = selectedOwner || repo.fullName.split('/')[0];
    try {
      const branchData = await githubApi.getBranches(owner, repo.name);
      setBranches(branchData.branches || []);
      const def = branchData.branches?.find((b) => b.isDefault)?.name || repo.defaultBranch || 'main';
      setSelectedBranch(def);
      runRepositoryAnalysis(owner, repo.name, def);
    } catch {
      setBranches([{ name: repo.defaultBranch || 'main', isDefault: true, protected: false }]);
      runRepositoryAnalysis(owner, repo.name, repo.defaultBranch || 'main');
    } finally {
      setIsLoadingBranches(false);
    }
  };

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

  const handleCompleteDeploy = async () => {
    if (!selectedRepo) {
      onShowToast('error', 'Missing Repository', 'Please select a repository to deploy');
      return;
    }
    if (!projectName.trim()) {
      onShowToast('error', 'Missing Project Name', 'Please enter a project name');
      return;
    }
    setIsDeploying(true);
    try {
      const result = await projectsApi.create({
        name: projectName.trim(),
        repositoryUrl: selectedRepo.htmlUrl || undefined,
        repositoryBranch: selectedBranch,
        defaultEnvironment: environment.toLowerCase() as 'development' | 'staging' | 'production',
        githubRepoId: selectedRepo.id,
        githubRepoOwner: selectedOwner || selectedRepo.fullName.split('/')[0],
        githubRepoFullName: selectedRepo.fullName,
        envVars: envVars.filter((v) => v.key.trim()),
      });
      const pid = result.project?.id;
      setSavedProjectId(pid || null);
      setSavedProject(result.project || null);

      // Persist configured environment variables (AES-256-GCM encrypted in backend)
      if (pid) {
        const validVars = envVars.filter((v) => v.key.trim() && v.value.trim());
        await Promise.allSettled(
          validVars.map((v) =>
            envVarsApi.save(pid, {
              key: v.key.trim().toUpperCase(),
              value: v.value,
              isSecret: true,
            })
          )
        );
      }

      onShowToast('success', 'Project Created', `Project "${projectName}" has been created successfully!`);
      setCurrentStep(5);
    } catch (err) {
      onShowToast('error', 'Create Failed', (err instanceof Error ? err.message : null) || 'Failed to create project. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSaveEc2Config = async () => {
    if (!savedProjectId) {
      onShowToast('error', 'No Project', 'Project must be created first');
      return;
    }
    if (!ec2PublicIp.trim()) {
      onShowToast('error', 'Missing IP', 'Please enter the EC2 Public IP address');
      return;
    }
    if (!ec2SshKey.trim()) {
      onShowToast('error', 'Missing SSH Key', 'Please paste your SSH private key (.pem)');
      return;
    }
    setIsSavingEc2(true);
    try {
      await ec2ConfigApi.saveConfig(savedProjectId, {
        publicIp: ec2PublicIp.trim(),
        sshUser: ec2SshUser.trim() || 'ubuntu',
        sshPort: ec2SshPort,
        sshPrivateKey: ec2SshKey.trim(),
        dockerfilePath: dockerfilePath.trim() || 'Dockerfile',
        awsRegion: ec2AwsRegion.trim() || 'us-east-1',
        hostPort: ec2HostPort,
        containerPort: ec2ContainerPort,
      });
      onShowToast('success', 'EC2 Configured', 'SSH target saved. You can now trigger a deployment!');
      setEc2VerifyResult(null);
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err.message || 'Could not save EC2 configuration');
    } finally {
      setIsSavingEc2(false);
    }
  };

  const handleVerifyEc2 = async () => {
    if (!savedProjectId) return;
    setIsVerifyingEc2(true);
    setEc2VerifyResult(null);
    try {
      const res = await ec2ConfigApi.verifyConnection(savedProjectId);
      setEc2VerifyResult({ ok: true, msg: `✓ Online · ${res.osInfo}${res.dockerInstalled ? ` · ${res.dockerVersion}` : ' · Docker will auto-install'}` });
      onShowToast('success', 'SSH Connected', res.osInfo);
    } catch (err: any) {
      setEc2VerifyResult({ ok: false, msg: `✗ ${err.message || 'Could not reach EC2 host'}` });
      onShowToast('error', 'SSH Failed', err.message || 'Could not reach EC2 host');
    } finally {
      setIsVerifyingEc2(false);
    }
  };

  const filteredRepos = repositories.filter(
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
          <p className="text-sm text-[#A1A1B5]">Connect a real GitHub repository and configure automated pipeline deployment.</p>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 z-10">
        {[
          { step: 1 as WizardStep, label: '1. GitHub', desc: 'OAuth Auth' },
          { step: 2 as WizardStep, label: '2. Repository', desc: 'Git Source' },
          { step: 3 as WizardStep, label: '3. Configure', desc: 'Dockerfile & Env' },
          { step: 4 as WizardStep, label: '4. Create', desc: 'Review & Save' },
          { step: 5 as WizardStep, label: '5. Target', desc: 'EC2 or EKS' },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step === 5 && savedProjectId) {
                  setCurrentStep(5);
                } else if ((isDone && s.step < 5 && !savedProjectId) || (s.step === 2 && isGitHubConnected && !savedProjectId)) {
                  setCurrentStep(s.step);
                }
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isActive
                  ? s.step === 5
                    ? 'bg-cyan-600/15 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-violet-600/15 border-violet-500/50 shadow-lg shadow-violet-500/10'
                  : isDone
                  ? 'bg-white/[0.04] border-white/10 hover:border-white/20'
                  : 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isActive ? (s.step === 5 ? 'text-cyan-300' : 'text-violet-300') : isDone ? 'text-white' : 'text-gray-400'}`}>
                  {s.label}
                </span>
                {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-[#A1A1B5]">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* STEP 1: Connect GitHub */}
      {currentStep === 1 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">GitHub Integration</h2>
              <p className="text-xs text-[#A1A1B5]">Connect your GitHub personal account or organization to load your repositories.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Connected State Card */}
            {isGitHubConnected ? (
              <div className="p-5 rounded-2xl border transition-all bg-violet-600/10 border-violet-500/40 ring-1 ring-violet-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-white font-bold text-xs">
                      {githubLogin.slice(0, 2).toUpperCase() || 'GH'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">@{githubLogin}</p>
                      <p className="text-[11px] text-[#A1A1B5]">Authenticated GitHub Account</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                </div>
                <p className="text-xs text-[#A1A1B5] mb-4">
                  OAuth token is verified and active. You can select repositories and branches directly from your account.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadAccountsAndRepos(githubLogin);
                      setCurrentStep(2);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Select Repositories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOAuth}
                    disabled={isConnecting}
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#A1A1B5] hover:text-white"
                    title="Re-authenticate or update scopes"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                        <GithubIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">No GitHub Account Linked</p>
                        <p className="text-[11px] text-[#A1A1B5]">OAuth Authorization Required</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 font-medium">
                      Not Connected
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1B5] mb-4">
                    Authorize the platform on GitHub to securely access your repositories, branches, and webhooks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartOAuth}
                  disabled={isConnecting || isLoadingAuth}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Redirecting to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <GithubIcon className="w-4 h-4" />
                      <span>Connect with GitHub OAuth</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Authorization Notice Card */}
            <div className="p-5 rounded-2xl bg-[#1B1B26]/60 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-violet-400" />
                    Requested Permissions
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300">
                    read:user read:org repo
                  </span>
                </div>
                <p className="text-xs text-[#A1A1B5] leading-relaxed">
                  The access token is encrypted with AES-256-GCM before storage and is only used to pull repository metadata and dispatch automated deployments.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkConnectionStatus}
                  disabled={isLoadingAuth}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 text-[#A1A1B5] ${isLoadingAuth ? 'animate-spin' : ''}`} />
                  <span>Check status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Select Repository */}
      {currentStep === 2 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-bold text-white">Select Repository</h2>
              <p className="text-xs text-[#A1A1B5]">Choose a real Git repository from your GitHub account.</p>
            </div>

            <div className="flex items-center gap-2">
              {accounts.length > 1 && (
                <select
                  value={selectedOwner}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  className="h-9 px-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.login} value={acc.login}>
                      {acc.type === 'organization' ? '🏢 ' : '👤 '} {acc.login}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-48 sm:w-56 h-9 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>
            </div>
          </div>

          {isLoadingRepos ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
              <p className="text-xs text-[#A1A1B5]">Fetching repositories from GitHub...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
              <ProjectIcon className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No repositories found</p>
              <p className="text-xs text-[#A1A1B5]">
                {repoSearch ? 'Try a different filter term' : 'No accessible repositories found for this account.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProjectIcon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-violet-300' : 'text-[#A1A1B5]'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{repo.name}</p>
                          <p className="text-xs font-mono text-[#A1A1B5] truncate">{repo.fullName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#A1A1B5] flex-shrink-0">
                        {repo.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[#A1A1B5]">
                      <span>Default branch: <code className="text-violet-300">{repo.defaultBranch || 'main'}</code></span>
                      {repo.updatedAt && <span>{new Date(repo.updatedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              disabled={!selectedRepo}
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Continue to Configure</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Configure Project */}
      {currentStep === 3 && (
        <div className="rounded-3xl bg-[#13131F]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 z-10 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configure Build &amp; Environment</h2>
              <p className="text-xs text-[#A1A1B5]">Set deployment targets, branch triggers, and runtime configuration.</p>
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
                Branch Target
              </label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const newBranch = e.target.value;
                    setSelectedBranch(newBranch);
                    if (selectedRepo) {
                      const owner = selectedOwner || selectedRepo.fullName.split('/')[0];
                      runRepositoryAnalysis(owner, selectedRepo.name, newBranch);
                    }
                  }}
                  disabled={isLoadingBranches}
                  className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.isDefault ? '(default)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value={selectedBranch}>{selectedBranch}</option>
                  )}
                </select>
                {isLoadingBranches && (
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                )}
              </div>
            </div>

            {/* SETUP-02: Repository Analysis Result Card */}
            <div className="col-span-1 md:col-span-2">
              {isAnalyzing ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-xs text-[#A1A1B5]">
                    Analyzing repository structure &amp; manifests on branch <code className="text-white font-mono">{selectedBranch}</code>...
                  </span>
                </div>
              ) : analysisResult ? (
                analysisResult.supported ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-300">Dockerfile Verified</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {analysisResult.dockerfilePath}
                          </span>
                          {analysisResult.framework && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-white/90">
                              {analysisResult.framework}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#A1A1B5] mt-0.5">
                          Detected files: {analysisResult.detectedFiles.join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                      MVP Build Ready
                    </span>
                  </div>
                ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-300">No Dockerfile Found</span>
                          {analysisResult.framework && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-white/90">
                              {analysisResult.framework}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-200/80 mt-0.5">
                          {analysisResult.reason || 'Repository must contain a Dockerfile to use the EC2 deployment engine.'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 shrink-0">
                      Dockerfile Required
                    </span>
                  </div>
                </div>
                )
              ) : null}

              {/* Custom Dockerfile Path (Monorepo / Subdirectory Support) */}
              {selectedRepo && (
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                  <div className="flex-1 space-y-1 text-left">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                      Dockerfile Path (Optional for Monorepos)
                    </label>
                    <input
                      type="text"
                      value={dockerfilePath}
                      onChange={(e) => setDockerfilePath(e.target.value)}
                      placeholder="Dockerfile or ./backend/Dockerfile"
                      className="w-full h-10 px-3 bg-[#0A0A12] border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => {
                      const parts = selectedRepo.fullName.split('/');
                      runRepositoryAnalysis(parts[0], parts[1], selectedBranch, dockerfilePath);
                    }}
                    className="h-10 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Verify Dockerfile</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-left md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
                Environment Target
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full h-11 px-3.5 bg-[#0A0A12] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="Development">Development</option>
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
              </select>
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
            <div className="flex items-center gap-3">
              {!isAnalyzing && analysisResult && !analysisResult.supported && (
                <span className="text-[11px] text-amber-400 font-mono hidden sm:inline">
                  Dockerfile required to continue
                </span>
              )}
              <button
                type="button"
                disabled={isAnalyzing || !analysisResult?.supported}
                onClick={() => setCurrentStep(4 as WizardStep)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Deploy → creates project, then goes to EC2 step if Dockerfile */}
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
              <p className="text-xs font-mono text-violet-300 mt-0.5 truncate">{selectedRepo?.fullName}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Environment</p>
              <p className="text-xs font-medium text-emerald-400 mt-0.5">{environment}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#A1A1B5] uppercase">Branch</p>
              <p className="text-xs font-mono text-white mt-0.5">{selectedBranch}</p>
            </div>
          </div>

          {/* Build Pipeline Plan */}
          <div className="p-4 rounded-xl bg-[#09090F] border border-white/5 font-mono text-xs space-y-2 text-[#A1A1B5]">
            <p className="text-white font-semibold text-[11px] uppercase tracking-wider font-sans">
              EC2 Docker Deployment Blueprint:
            </p>
            <p>1. Connect to your AWS EC2 node over SSH &amp; bootstrap Docker Engine</p>
            <p>2. Clone/pull <span className="text-violet-300">{selectedRepo?.fullName}</span> ({selectedBranch})</p>
            <p>3. Inject {envVars.length} runtime environment variables into <code className="text-sky-300">.env</code> (chmod 0600)</p>
            <p>4. Build container image from <code className="text-sky-300">{dockerfilePath || 'Dockerfile'}</code></p>
            <p>5. Start container with <code className="text-emerald-300">--restart unless-stopped</code> &amp; run HTTP readiness probe</p>
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
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Target Infrastructure (EC2 BYOS or Cluster Mode BYOC) */}
      {currentStep === 5 && (
        <div className="rounded-3xl bg-[#0D1117]/90 backdrop-blur-xl border border-cyan-500/20 p-6 sm:p-8 space-y-6 z-10 shadow-xl shadow-cyan-500/5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-cyan-500/15">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
              {targetMode === 'ec2' ? <Server className="w-5 h-5" /> : <Cpu className="w-5 h-5 text-violet-300" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {targetMode === 'ec2' ? 'EC2 Target Server' : 'AWS EKS Cluster Target'}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                  {targetMode === 'ec2' ? 'BYOS' : 'BYOC'}
                </span>
              </h2>
              <p className="text-xs text-[#A1A1B5]">
                {targetMode === 'ec2'
                  ? 'Connect your AWS EC2 instance. The platform will SSH in and deploy your Dockerfile automatically.'
                  : 'Connect your AWS account (IAM Role or Access Keys). Terraform provisions EKS and Kubernetes deploys your app.'}
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetMode('ec2')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                targetMode === 'ec2'
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <Server className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold font-mono">Single Server — EC2 (BYOS)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Docker + SSH direct deployment</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetMode('cluster')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                targetMode === 'cluster'
                  ? 'bg-violet-500/15 border-violet-500/50 text-white'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <Cpu className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold font-mono">Cluster Mode — EKS (BYOC)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Terraform + ECR + Kubernetes on your AWS</p>
              </div>
            </button>
          </div>

          {/* Project created notice */}
          {savedProjectId && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Project created successfully! Configure your target infrastructure below.</span>
            </div>
          )}

          {targetMode === 'cluster' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClusterAuthMode('IAM_ROLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                    clusterAuthMode === 'IAM_ROLE'
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-black/30 border-white/10 text-slate-400'
                  }`}
                >
                  IAM Role ARN (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setClusterAuthMode('ACCESS_KEYS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                    clusterAuthMode === 'ACCESS_KEYS'
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-black/30 border-white/10 text-slate-400'
                  }`}
                >
                  AWS Access Keys
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clusterAuthMode === 'IAM_ROLE' ? (
                  <>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">AWS IAM Role ARN *</label>
                      <input
                        type="text"
                        value={clusterRoleArn}
                        onChange={(e) => setClusterRoleArn(e.target.value)}
                        placeholder="arn:aws:iam::123456789012:role/iiap-byoc-provisioner"
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">External ID (Optional)</label>
                      <input
                        type="text"
                        value={clusterExternalId}
                        onChange={(e) => setClusterExternalId(e.target.value)}
                        placeholder="iiap-external-id"
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">AWS Access Key ID *</label>
                      <input
                        type="text"
                        value={clusterAccessKeyId}
                        onChange={(e) => setClusterAccessKeyId(e.target.value)}
                        placeholder="AKIA..."
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">AWS Secret Access Key *</label>
                      <input
                        type="password"
                        value={clusterSecretKey}
                        onChange={(e) => setClusterSecretKey(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">AWS Region</label>
                  <input
                    type="text"
                    value={clusterRegion}
                    onChange={(e) => setClusterRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">EKS Cluster Name</label>
                  <input
                    type="text"
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    placeholder={`iiap-${projectName || 'app'}-eks`}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">Worker Node Type</label>
                  <input
                    type="text"
                    value={clusterInstanceType}
                    onChange={(e) => setClusterInstanceType(e.target.value)}
                    placeholder="t3.medium"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">Desired Worker Nodes</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={clusterDesiredNodes}
                    onChange={(e) => setClusterDesiredNodes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono"
                  />
                </div>
              </div>

              {clusterVerifyResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono ${clusterVerifyResult.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-rose-500/10 border-rose-500/25 text-rose-300'}`}>
                  {clusterVerifyResult.msg}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => (savedProject && onProjectCreated ? onProjectCreated(savedProject) : onNavigate('projects'))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                >
                  Open Project Dashboard →
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSavingCluster || !savedProjectId}
                    onClick={async () => {
                      if (!savedProjectId) return;
                      setIsSavingCluster(true);
                      try {
                        await awsClusterConfigApi.saveConfig(savedProjectId, {
                          authMode: clusterAuthMode,
                          awsRegion: clusterRegion.trim() || 'us-east-1',
                          roleArn: clusterAuthMode === 'IAM_ROLE' ? clusterRoleArn.trim() : undefined,
                          externalId: clusterExternalId.trim() || undefined,
                          accessKeyId: clusterAuthMode === 'ACCESS_KEYS' ? clusterAccessKeyId.trim() : undefined,
                          secretAccessKey: clusterAuthMode === 'ACCESS_KEYS' ? clusterSecretKey.trim() : undefined,
                          clusterName: clusterName.trim() || undefined,
                          nodeInstanceType: clusterInstanceType.trim() || 't3.medium',
                          desiredNodes: Number(clusterDesiredNodes) || 2,
                        });
                        onShowToast('success', 'BYOC Cluster Saved', 'AWS EKS cluster configuration encrypted and saved.');
                      } catch (err: any) {
                        onShowToast('error', 'Save Failed', err.message || 'Could not save AWS cluster config');
                      } finally {
                        setIsSavingCluster(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-violet-700/70 hover:bg-violet-700 border border-violet-500/40 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    {isSavingCluster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>{isSavingCluster ? 'Saving...' : 'Save Cluster Config'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isVerifyingCluster || !savedProjectId}
                    onClick={async () => {
                      if (!savedProjectId) return;
                      setIsVerifyingCluster(true);
                      setClusterVerifyResult(null);
                      try {
                        const res = await awsClusterConfigApi.verifyCredentials(savedProjectId);
                        setClusterVerifyResult({
                          ok: true,
                          msg: `Verified! Cluster '${res.clusterName}' in ${res.awsRegion} (${res.authMode}) is ready for Terraform.`,
                        });
                        onShowToast('success', 'AWS Credentials Verified', `Ready to provision ${res.clusterName}`);
                      } catch (err: any) {
                        setClusterVerifyResult({ ok: false, msg: err.message || 'Verification failed' });
                        onShowToast('error', 'Verification Failed', err.message || 'Check your AWS credentials');
                      } finally {
                        setIsVerifyingCluster(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40"
                  >
                    {isVerifyingCluster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{isVerifyingCluster ? 'Verifying...' : 'Verify AWS Credentials'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* EC2 form grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Public IP */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">EC2 Public IPv4 Address *</label>
              <input
                type="text"
                value={ec2PublicIp}
                onChange={(e) => setEc2PublicIp(e.target.value)}
                placeholder="54.210.120.45"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* SSH User */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">SSH Username</label>
              <input
                type="text"
                value={ec2SshUser}
                onChange={(e) => setEc2SshUser(e.target.value)}
                placeholder="ubuntu"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* SSH Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">SSH Port</label>
              <input
                type="number"
                value={ec2SshPort}
                onChange={(e) => setEc2SshPort(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* Host Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">Host Port (External)</label>
              <input
                type="number"
                value={ec2HostPort}
                onChange={(e) => setEc2HostPort(Number(e.target.value))}
                placeholder="80"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* Container Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">Container Port (Internal)</label>
              <input
                type="number"
                value={ec2ContainerPort}
                onChange={(e) => setEc2ContainerPort(Number(e.target.value))}
                placeholder="3000"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>

            {/* AWS Region */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider">AWS Region</label>
              <select
                value={ec2AwsRegion}
                onChange={(e) => setEc2AwsRegion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              >
                {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-central-1','ap-southeast-1','ap-northeast-1'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* SSH Private Key */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#A1A1B5] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  SSH Private Key (.pem) *
                </label>
                <button
                  type="button"
                  onClick={() => setEc2ShowKey(!ec2ShowKey)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {ec2ShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{ec2ShowKey ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <textarea
                value={ec2SshKey}
                onChange={(e) => setEc2SshKey(e.target.value)}
                rows={ec2ShowKey ? 8 : 3}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;b3BlbnNzaC1rZXktdjEAAAAA...&#10;-----END OPENSSH PRIVATE KEY-----"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-none"
                style={{ filter: ec2ShowKey ? 'none' : 'blur(3px)' }}
              />
              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-500" />
                Key is encrypted with AES-256-GCM before storage. Never leaves your infrastructure.
              </p>
            </div>
          </div>

          {/* Verify result banner */}
          {ec2VerifyResult && (
            <div className={`p-3 rounded-xl border font-mono text-xs flex items-center gap-2.5 ${
              ec2VerifyResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
            }`}>
              {ec2VerifyResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{ec2VerifyResult.msg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => (savedProject && onProjectCreated ? onProjectCreated(savedProject) : onNavigate('projects'))}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
            >
              Open Project Dashboard →
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveEc2Config}
                disabled={isSavingEc2 || !ec2PublicIp.trim() || !ec2SshKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-700/60 hover:bg-cyan-700/80 border border-cyan-500/40 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isSavingEc2 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                <span>{isSavingEc2 ? 'Saving...' : 'Save EC2 Config'}</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyEc2}
                disabled={isVerifyingEc2 || !savedProjectId}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-bold shadow-[0_4px_20px_-4px_rgba(6,182,212,0.5)] hover:brightness-110 active:scale-[0.98] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isVerifyingEc2 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isVerifyingEc2 ? 'Probing SSH...' : 'Test SSH Connection'}</span>
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NewProjectPage;
