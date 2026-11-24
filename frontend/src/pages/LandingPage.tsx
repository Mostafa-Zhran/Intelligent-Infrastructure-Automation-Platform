import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  Terminal,
  CheckCircle2,
  ShieldCheck,
  GitBranch,
  Box,
  Container,
  Cpu,
  Server,
  Code2,
  Copy,
  Check,
  Play,
  Network,
  Zap,
} from 'lucide-react';
import { PageId } from '../types';

const InfrastructureScene3D = React.lazy(() =>
  import('../components/3d/InfrastructureScene3D').then((m) => ({ default: m.InfrastructureScene3D }))
);

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  isAuthenticated = false,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'manifest' | 'terraform'>('pipeline');
  const [copiedCode, setCopiedCode] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const architectureRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sampleManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app.kubernetes.io/managed-by: iiap
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
      containers:
        - name: service
          image: ghcr.io/acme-cloud/payment-service:v2.4.0
          ports:
            - containerPort: 3000
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { cpu: 500m, memory: 512Mi }`;

  const sampleTerraform = `module "production_cluster" {
  source       = "terraform-aws-modules/eks/aws"
  version      = "~> 20.0"
  cluster_name = "iiap-prod-us-east-1"
  
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  enable_irsa              = true
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    worker_nodes = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
    }
  }
}`;

  return (
    <div className="w-full relative overflow-hidden select-none bg-[#07070D] text-slate-100">
      {/* ── 1. Hero Viewport ────────────────────────────────────────────── */}
      <section className="relative w-full min-h-[92vh] flex flex-col justify-between pt-8 sm:pt-14 pb-12">
        {/* Ambient 3D Canvas in background */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
          <React.Suspense fallback={<div className="w-full h-full bg-[#07070D]" />}>
            <InfrastructureScene3D onNavigate={onNavigate} />
          </React.Suspense>
        </div>

        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-violet-600/10 blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-48 left-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[130px] pointer-events-none -z-10" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          {/* Engineering Release Pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-semibold">IIAP Platform v2.4</span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-300">CNCF Kubernetes & Terraform Native</span>
          </div>

          {/* Primary Punchy Headline (No cheesy gradient text, pure typographic weight) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl text-balance">
            Automate cloud infrastructure. From Git commit to live cluster.
          </h1>

          {/* Calibrated Body Copy (65-75ch measure) */}
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-slate-300 max-w-[68ch] mx-auto leading-relaxed text-balance font-sans">
            Connect any GitHub repository. IIAP builds hermetic Docker containers, verifies Terraform AWS topologies, and orchestrates live Kubernetes rollouts with deterministic endpoints in seconds.
          </p>

          {/* Main Action CTAs */}
          <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-sm sm:max-w-none">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'projects' : 'signin')}
              className="w-full sm:w-auto h-12 px-7 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-[0_0_28px_rgba(124,58,237,0.45)] hover:shadow-[0_0_36px_rgba(124,58,237,0.65)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <span>{isAuthenticated ? 'Open Projects Console' : 'Start Deploying Free'}</span>
              <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={scrollToFeatures}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-sm font-medium transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-[0.98]"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Explore Architecture</span>
            </button>
          </div>

          {/* Live Proof Badges */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero-Config K3s & EKS</span>
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Automated GHCR Registry</span>
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Least-Privilege Security</span>
            </span>
          </div>
        </div>

        {/* ── Interactive Engineering Console Preview ─────────────────────── */}
        <div className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12">
          <div className="rounded-2xl bg-[#0B0B14] border border-white/10 shadow-[0_24px_70px_-16px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Window Chrome Header */}
            <div className="px-4 py-3 bg-[#11111E] border-b border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
                  iiap-runner :: live-delivery-telemetry
                </span>
              </div>

              {/* Console Tabs */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'pipeline'
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span>Pipeline Execution</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manifest')}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'manifest'
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  <span>K8s Manifest</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('terraform')}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'terraform'
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Box className="w-3 h-3" />
                  <span>Terraform IaC</span>
                </button>
              </div>
            </div>

            {/* Console Body Content */}
            <div className="p-4 sm:p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto min-h-[260px] max-h-[360px]">
              {activeTab === 'pipeline' && (
                <div className="space-y-2">
                  <div className="text-slate-500"># Autonomous 4-Stage CI/CD Dispatch</div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>[PIPE-04] Git Checkout: repo acme-cloud/payment-service (commit 9e4a1b7)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>[PIPE-05] Docker BuildKit: container compiled and pushed to ghcr.io</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>[PIPE-06] Terraform: security compliance audit passed (0 drift detected)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>[PIPE-07] Kubernetes: namespace production ready. Pods 3/3 Running</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-semibold text-emerald-300">Live Endpoint Assigned:</span>
                      <span className="text-white underline decoration-emerald-500/50">https://payment-service.acme-cloud.io</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      ONLINE
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'manifest' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => handleCopySnippet(sampleManifest)}
                    className="absolute top-0 right-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Copy Manifest"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="text-slate-300 whitespace-pre">{sampleManifest}</pre>
                </div>
              )}

              {activeTab === 'terraform' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => handleCopySnippet(sampleTerraform)}
                    className="absolute top-0 right-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Copy Terraform"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="text-slate-300 whitespace-pre">{sampleTerraform}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Cloud Native Ecosystem Strip ──────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#090912]/80 backdrop-blur-xl py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">
            Engineered natively for the standard modern cloud stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-400 font-mono text-sm">
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Box className="w-4 h-4 text-violet-400" />
              <span>Terraform</span>
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Kubernetes K3s</span>
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Container className="w-4 h-4 text-cyan-400" />
              <span>Docker BuildKit</span>
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Server className="w-4 h-4 text-amber-400" />
              <span>AWS EC2 & EKS</span>
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>GitHub Actions</span>
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>HashiCorp Vault</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. High-Craft Bento Architecture Grid ────────────────────────── */}
      <section ref={featuresRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center mb-14 sm:mb-18">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight text-balance">
            Zero-friction delivery. Enterprise-grade compliance.
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed text-balance">
            Replace complex bash scripts and fragmented tooling with an end-to-end, declarative control plane designed for high-velocity teams.
          </p>
        </div>

        {/* Asymmetrical Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Item 1: Wide Featured Card */}
          <div className="md:col-span-2 rounded-2xl bg-[#0B0B14] border border-white/10 p-7 sm:p-9 flex flex-col justify-between hover:border-white/20 transition-all group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Declarative Multi-Cloud Infrastructure as Code
              </h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xl">
                Define cloud topology in pure HCL. The platform verifies plans, audits cloud credentials, injects least-privilege security policies, and commits reproducible state directly to S3 and DynamoDB lock tables.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs text-slate-300 flex items-center justify-between">
              <span className="text-emerald-400 font-semibold">✓ 100% Hermetic Execution</span>
              <span className="text-slate-500">Automated State Locking & Backup</span>
            </div>
          </div>

          {/* Bento Item 2: Dynamic Port Routing */}
          <div className="rounded-2xl bg-[#0B0B14] border border-white/10 p-7 sm:p-9 flex flex-col justify-between hover:border-white/20 transition-all group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Deterministic NodePort Ingress
              </h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Every project gets an isolated NodePort mapped dynamically between 30000 and 32767. Zero port collisions across concurrent deployments.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 font-mono text-xs text-cyan-300">
              Auto-dispatched DNS & Ingress
            </div>
          </div>

          {/* Bento Item 3: Automated Container BuildKit */}
          <div className="rounded-2xl bg-[#0B0B14] border border-white/10 p-7 sm:p-9 flex flex-col justify-between hover:border-white/20 transition-all group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
                <Container className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                High-Speed BuildKit Pipeline
              </h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Multi-stage container builds with layer caching directly on GitHub Container Registry (GHCR) for sub-40s compile and tag workflows.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 font-mono text-xs text-sky-300">
              SHA-Pinned Reproducible Images
            </div>
          </div>

          {/* Bento Item 4: Wide Card Zero-Trust Security */}
          <div className="md:col-span-2 rounded-2xl bg-[#0B0B14] border border-white/10 p-7 sm:p-9 flex flex-col justify-between hover:border-white/20 transition-all group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Hardened Zero-Trust Execution Baseline
              </h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xl">
                Containers drop ALL Linux capabilities, run as unprivileged non-root users (UID 10001), disable token automounting on ServiceAccounts, and enforce strict liveness and readiness probe gates.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <span className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-300 text-center">
                runAsNonRoot: true
              </span>
              <span className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-300 text-center">
                capabilities: [DROP ALL]
              </span>
              <span className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-300 text-center col-span-2 sm:col-span-1">
                Zero TOFU SSH Bypass
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. End-to-End Delivery Architecture ──────────────────────────── */}
      <section ref={architectureRef} className="border-t border-white/5 bg-[#08080F] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
              The End-to-End Automation Loop
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed text-balance">
              How a code push translates to an active production workload across four orchestrated pipeline gates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Commit Webhook',
                desc: 'Developer pushes code. GitHub OAuth verifies repository identity and triggers the authenticated workflow dispatch.',
                tech: 'GitHub API & Webhooks',
                icon: GitBranch,
                accent: 'text-amber-400',
              },
              {
                step: '02',
                title: 'Artifact Synthesis',
                desc: 'Multi-stage Docker BuildKit compiles microservice binaries, tags the commit SHA, and signs images on GHCR.',
                tech: 'Docker & GHCR',
                icon: Container,
                accent: 'text-cyan-400',
              },
              {
                step: '03',
                title: 'Topology Verification',
                desc: 'Terraform and Ansible execute speculative dry-runs against the AWS VPC and compute nodes without leaking secrets.',
                tech: 'Terraform & OpenTofu',
                icon: Box,
                accent: 'text-violet-400',
              },
              {
                step: '04',
                title: 'Live Cluster Apply',
                desc: 'Kubectl renders manifests and rolls out workloads to K3s with verified readiness probes and a live public endpoint.',
                tech: 'Kubernetes Engine',
                icon: Cpu,
                accent: 'text-emerald-400',
              },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="p-6 rounded-2xl bg-[#0D0D18] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-bold text-slate-500">STAGE {st.step}</span>
                      <Icon className={`w-5 h-5 ${st.accent}`} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{st.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-500">
                    {st.tech}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Hardened Conversion Call to Action ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="rounded-3xl bg-gradient-to-b from-[#121222] to-[#0A0A14] border border-white/10 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle top specular accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight text-balance">
              Deploy your infrastructure with confidence.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-balance">
              Join engineering teams shipping with automated Terraform plans, hermetic container builds, and live Kubernetes clusters.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-sm sm:max-w-none mx-auto">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'projects' : 'signin')}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-[0_0_28px_rgba(124,58,237,0.45)] hover:shadow-[0_0_36px_rgba(124,58,237,0.65)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Get Started Now'}</span>
              <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto h-12 px-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
