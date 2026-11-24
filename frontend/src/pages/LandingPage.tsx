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
      <section className="relative w-full h-screen flex flex-col overflow-hidden pt-6 sm:pt-8">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-violet-600/8 blur-[140px] pointer-events-none z-0" />
        <div className="absolute top-20 right-1/4 w-[380px] h-[280px] bg-sky-500/7 blur-[120px] pointer-events-none z-0" />

        {/* ── Top Row: Text (left) + 3D Scene (right) ───────────────── */}
        <div className="relative z-10 flex flex-1 min-h-0 items-center">

          {/* LEFT: Hero text, CTAs, badges */}
          <div className="flex flex-col justify-center w-full lg:w-[52%] px-6 sm:px-10 lg:px-14 shrink-0 py-4">
            {/* Engineering Release Pill */}
            <div className="inline-flex self-start items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-semibold">IIAP Platform v2.4</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-300">CNCF Kubernetes &amp; Terraform Native</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.2rem] font-extrabold tracking-tight text-white leading-[1.1] max-w-2xl text-balance">
              Automate cloud infrastructure. From Git commit to live cluster.
            </h1>

            {/* Sub copy */}
            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-[55ch] leading-relaxed text-balance font-sans">
              Connect any GitHub repository. IIAP builds hermetic Docker containers, verifies Terraform AWS topologies, and orchestrates live Kubernetes rollouts with deterministic endpoints in seconds.
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-col sm:flex-row items-start gap-3">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'projects' : 'signin')}
                className="h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-[0_0_28px_rgba(124,58,237,0.45)] hover:shadow-[0_0_36px_rgba(124,58,237,0.65)] transition-all flex items-center gap-2 group active:scale-[0.98]"
              >
                <span>{isAuthenticated ? 'Open Projects Console' : 'Start Deploying Free'}</span>
                <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                type="button"
                onClick={scrollToFeatures}
                className="h-11 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-md active:scale-[0.98]"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Explore Architecture</span>
              </button>
            </div>

            {/* Proof Badges */}
            <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero-Config K3s &amp; EKS</span>
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Automated GHCR Registry</span>
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>Least-Privilege Security</span>
              </span>
            </div>
          </div>

          {/* RIGHT: 3D Scene — contained side column */}
          <div className="hidden lg:block lg:w-[48%] h-full relative opacity-55 mix-blend-screen pointer-events-auto">
            <React.Suspense fallback={<div className="w-full h-full bg-transparent" />}>
              <InfrastructureScene3D onNavigate={onNavigate} />
            </React.Suspense>
          </div>
        </div>

        {/* ── Bottom: Terminal Console ─────────────────────────────────── */}
        <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 shrink-0">
          {/* Ambient Under-Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-cyan-500/15 to-purple-600/20 rounded-2xl blur-xl opacity-50 pointer-events-none" />

          <div className="relative rounded-2xl bg-[#080911] border border-white/[0.12] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Top Specular Hairline */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

            {/* Window Chrome Header */}
            <div className="px-4 py-2.5 bg-[#0D0E1A] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 inline-block" />
                </div>
                <div className="h-3.5 w-[1px] bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300 font-semibold hidden sm:inline">iiap-agent@cluster-mesh</span>
                  <span className="text-slate-500 hidden sm:inline">::</span>
                  <span className="text-slate-400 font-mono text-[11px]">session #4092</span>
                </div>
              </div>

              {/* Console Tabs */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'pipeline'
                      ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)] font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span className="hidden sm:inline">Pipeline</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold">PASS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manifest')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'manifest'
                      ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)] font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Code2 className="w-3 h-3 text-sky-400" />
                  <span className="hidden sm:inline">K8s Manifest</span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1 py-0.5 rounded font-mono">YAML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('terraform')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'terraform'
                      ? 'bg-violet-600/30 text-white border border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)] font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Box className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Terraform IaC</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-mono">HCL</span>
                </button>
              </div>
            </div>

            {/* Console Body — compact height */}
            <div className="p-3 sm:p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto overflow-y-auto max-h-[190px] bg-[#07080F]">
              {activeTab === 'pipeline' && (
                <div className="space-y-2">
                  {/* Metadata bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.06] text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <Terminal className="w-3 h-3 text-violet-400" />
                        acme-cloud/payment-service
                      </span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-300">main (9e4a1b7)</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">4.9s total</span>
                  </div>
                  {/* Compact stages */}
                  <div className="space-y-1.5">
                    {[
                      { label: 'SOURCE CHECKOUT', time: '0.6s', desc: 'GPG verified · Clean tree' },
                      { label: 'CONTAINER BUILD', time: '2.2s', desc: 'BuildKit · 94.2% cache · ghcr.io/acme-cloud/payment-service:v2.4.0' },
                      { label: 'TERRAFORM AUDIT', time: '1.1s', desc: 'S3 state lock · 0 drift · IAM IRSA compliant' },
                      { label: 'K8S ROLLOUT', time: '1.0s', desc: '3/3 pods ready · NodePort 30452 assigned' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-white font-bold">{s.label}</span>
                          <span className="ml-2 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">PASS {s.time}</span>
                          <p className="text-slate-400 text-[10px] mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Live endpoint */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <a href="https://payment-service.acme-cloud.io" target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()} className="text-white text-[11px] font-bold underline decoration-emerald-500/50">
                        https://payment-service.acme-cloud.io
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">NodePort 30452</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">14ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">TLS 1.3</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'manifest' && (
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-[11px] text-slate-400">
                    <span className="text-white font-medium">manifests/production/deployment.yaml</span>
                    <button type="button" onClick={() => handleCopySnippet(sampleManifest)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300 transition-colors border border-white/5">
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-slate-300 font-mono text-xs whitespace-pre overflow-x-auto leading-relaxed">{sampleManifest}</pre>
                </div>
              )}

              {activeTab === 'terraform' && (
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-[11px] text-slate-400">
                    <span className="text-white font-medium">terraform/environments/production/main.tf</span>
                    <button type="button" onClick={() => handleCopySnippet(sampleTerraform)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300 transition-colors border border-white/5">
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-slate-300 font-mono text-xs whitespace-pre overflow-x-auto leading-relaxed">{sampleTerraform}</pre>
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
