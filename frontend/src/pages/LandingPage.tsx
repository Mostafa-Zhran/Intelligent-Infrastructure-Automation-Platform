import React, { useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  GitBranch,
  Box,
  Container,
  Cpu,
  Server,
  Network,
  Zap,
} from 'lucide-react';
import { PageId } from '../types';
import { BrandLogo } from '../components/common/BrandLogo';

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
  const featuresRef = useRef<HTMLDivElement>(null);
  const architectureRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full relative overflow-hidden select-none bg-[#07070D] text-slate-100">
      {/* ── 1. Hero Viewport — full-screen on desktop, compact fit on mobile without huge gap ───────────────────── */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] sm:h-[calc(100vh-4rem)] flex flex-col justify-start sm:justify-center pt-8 sm:pt-0 pb-12 sm:pb-0 overflow-hidden">
        {/* Ambient 3D Canvas in background — fills entire section */}
        <div className="absolute inset-0 z-0 opacity-45 mix-blend-screen pointer-events-auto">
          <React.Suspense fallback={<div className="w-full h-full bg-[#07070D]" />}>
            <InfrastructureScene3D onNavigate={onNavigate} />
          </React.Suspense>
        </div>

        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-violet-600/10 blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-24 sm:top-48 left-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[130px] pointer-events-none -z-10" />

        {/* Hero text — centred over the 3D background */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center pointer-events-none">
          {/* Engineering Release Pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg mb-4 sm:mb-6 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-semibold">IIAP Platform v2.4</span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-300">CNCF Kubernetes &amp; Terraform Native</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.15] sm:leading-[1.1] max-w-4xl text-balance pointer-events-none">
            Automate cloud infrastructure. From Git commit to live cluster.
          </h1>

          {/* Body Copy */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-slate-300 max-w-[68ch] mx-auto leading-relaxed text-balance font-sans pointer-events-none">
            Connect any GitHub repository. IIAP builds hermetic Docker containers, verifies Terraform AWS topologies, and orchestrates live Kubernetes rollouts with deterministic endpoints in seconds.
          </p>

          {/* CTAs */}
          <div className="mt-6 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 w-full max-w-sm sm:max-w-none pointer-events-auto">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'projects' : 'signin')}
              className="w-full sm:w-auto h-11 sm:h-12 px-7 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-[0_0_28px_rgba(124,58,237,0.45)] hover:shadow-[0_0_36px_rgba(124,58,237,0.65)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <span>{isAuthenticated ? 'Open Projects Console' : 'Start Deploying Free'}</span>
              <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={scrollToFeatures}
              className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-sm font-medium transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-[0.98]"
            >
              <BrandLogo className="w-4 h-4" />
              <span>Explore Architecture</span>
            </button>
          </div>

          {/* Live Proof Badges */}
          <div className="mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-xs text-slate-400 font-mono pointer-events-auto">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero-Config K3s &amp; EKS</span>
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
