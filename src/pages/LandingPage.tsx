import React, { useRef } from 'react';
import {
  ArrowRight, Zap, CheckCircle2, ShieldCheck, RefreshCw,
  GitBranch, Box, Layers, Container, Cpu, Sparkles,
  ChevronDown, Eye, Server, BarChart3, ChevronRight, Activity
} from 'lucide-react';
import { PageId } from '../types';
import { InfrastructureScene3D } from '../components/3d/InfrastructureScene3D';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
  isAuthenticated?: boolean;
}

const featuresData = [
  {
    id: 'infra-auto',
    title: 'Infrastructure Automation',
    subtitle: 'Declarative Cloud Topology',
    desc: 'Automate complex multi-cloud VPCs, Kubernetes clusters, and storage fabrics with zero manual configuration. Continuous drift reconciliation ensures production always mirrors your Git repository state.',
    icon: Box,
    badge: 'Terraform & OpenTofu',
    badgeClass: 'badge-violet',
    stat: '100% Declarative',
    color: '#A78BFA',
  },
  {
    id: 'cicd-mgmt',
    title: 'CI/CD Pipeline Management',
    subtitle: 'Hermetic Delivery Loops',
    desc: 'Pre-configured, battle-tested pipeline stages execute parallelized tests, artifact caching, container signing, and multi-cloud rollouts with sub-minute execution speeds.',
    icon: Layers,
    badge: 'Automated Rails',
    badgeClass: 'badge-cyan',
    stat: '< 45s Execution',
    color: '#38BDF8',
  },
  {
    id: 'sec-comp',
    title: 'Security and Compliance',
    subtitle: 'Zero-Trust Defense Fabric',
    desc: 'Built-in automated IAM policy audits, runtime secret injection via HashiCorp Vault, vulnerability SBOM scans, and end-to-end mTLS encryption exceeding SOC2 Type II benchmarks.',
    icon: ShieldCheck,
    badge: 'mTLS + Vault',
    badgeClass: 'badge-emerald',
    stat: 'SOC2 Type II',
    color: '#34D399',
  },
  {
    id: 'env-prov',
    title: 'Environment Provisioning',
    subtitle: 'Ephemeral Preview Stacks',
    desc: 'Spin up on-demand staging and sandbox environments for every pull request with isolated network namespaces, realistic database seeding, and automated teardown triggers.',
    icon: Server,
    badge: 'Instant On-Demand',
    badgeClass: 'badge-amber',
    stat: '0 Waste Overhead',
    color: '#FCD34D',
  },
  {
    id: 'mon-obs',
    title: 'Monitoring and Observability',
    subtitle: 'Real-Time Edge Telemetry',
    desc: 'Unified streaming telemetry integrating OpenTelemetry metrics, structured distributed tracing, and automated health checks that trigger canary rollbacks before outages occur.',
    icon: BarChart3,
    badge: 'OpenTelemetry',
    badgeClass: 'badge-violet',
    stat: '99.99% Availability',
    color: '#C084FC',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Code Commit & Trigger',
    desc: 'Developers push commits or open pull requests. Webhook triggers cryptographic identity verification.',
    tech: 'Git · GitHub · GitLab',
    icon: GitBranch,
    accent: '#FBBF24',
  },
  {
    number: '02',
    title: 'Declarative IaC Plan',
    desc: 'Terraform runs automated speculative plans, security compliance audits, and cloud cost calculations.',
    tech: 'Terraform · Policy-as-Code',
    icon: Box,
    accent: '#A78BFA',
  },
  {
    number: '03',
    title: 'Hermetic Containerization',
    desc: 'Multi-stage Docker BuildKit compiles microservice binaries, attaches SBOM, and signs artifacts.',
    tech: 'Docker · BuildKit · Cosign',
    icon: Container,
    accent: '#38BDF8',
  },
  {
    number: '04',
    title: 'Automated Canary Rollout',
    desc: 'Kubernetes ingress orchestrates progressive blue/green traffic migration with real-time SLA verification.',
    tech: 'Kubernetes · Helm · Istio',
    icon: Cpu,
    accent: '#34D399',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  isAuthenticated = false,
}) => {
  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full relative overflow-hidden select-none animate-fadeIn">
      {/* ── 1. Full-Width 3D Hero Scene ─────────────────────────────────── */}
      <section className="relative w-full min-h-[92vh] flex flex-col justify-between pt-6 sm:pt-10">
        {/* Background 3D Canvas */}
        <div className="absolute inset-0 z-0">
          <InfrastructureScene3D onNavigate={onNavigate} />
        </div>

        {/* Foreground Hero Content with backdrop scrim for maximum readability */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/50 backdrop-blur-xl border border-violet-500/35 text-xs text-violet-300 shadow-xl mb-6 pointer-events-auto animate-scaleIn">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold tracking-wide uppercase font-mono text-[11px]">
              Intelligent DevOps & Cloud Infrastructure
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-2xl">
            Fill a form.{' '}
            <span className="text-gradient-violet block sm:inline">
              We run the pipeline.
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 text-sm sm:text-lg lg:text-xl text-[#D1D1E0] max-w-2xl mx-auto leading-relaxed drop-shadow-md px-1">
            Deploy enterprise-grade cloud environments with Terraform, Ansible, Docker, and Kubernetes through one unified 3D-orchestrated workflow.
          </p>

          {/* Interactive Hero CTAs */}
          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'profile' : 'signin')}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl text-white font-semibold text-base shadow-xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 group hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                border: '1px solid rgba(139,92,246,0.6)',
                boxShadow: '0 8px 32px -4px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={scrollToFeatures}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl text-gray-200 font-semibold text-base bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] backdrop-blur-md border border-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Explore Platform</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-10 text-xs text-[#A1A1B5] font-mono pointer-events-auto px-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Zero Configuration
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Self-Healing Meshes
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-violet-400" />
              SOC2 Type II Ready
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="relative z-20 pb-6 flex flex-col items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={scrollToFeatures}
            className="flex flex-col items-center gap-1.5 text-xs font-mono text-[#A1A1B5] hover:text-white transition-colors group p-2"
            aria-label="Scroll to platform capabilities"
          >
            <span className="tracking-wider uppercase text-[10px]">Explore Capabilities</span>
            <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:translate-y-1 transition-transform animate-bounce" />
          </button>
        </div>
      </section>

      {/* ── 2. Platform Features Grid ───────────────────────────────────── */}
      <section ref={featuresRef} id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-24 space-y-8 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Core Architecture Pillars</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Intelligent Infrastructure Automation
          </h2>
          <p className="text-xs sm:text-base text-[#A1A1B5] leading-relaxed">
            Eliminate fragile scripts and manual provisioning with self-healing, declarative infrastructure building blocks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {featuresData.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl"
                style={{
                  boxShadow: '0 20px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                      style={{
                        background: `${f.color}20`,
                        border: `1px solid ${f.color}50`,
                      }}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: f.color }} />
                    </div>
                    <span className={`badge ${f.badgeClass}`}>{f.badge}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-violet-200 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-mono font-semibold text-cyan-300/90 mt-1">
                    {f.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-[#A1A1B5] leading-relaxed mt-2.5 sm:mt-3">
                    {f.desc}
                  </p>
                </div>

                <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-white/90">
                    {f.stat}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('signin')}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 group-hover:translate-x-0.5"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. How It Works (End-to-End Workflow) ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/40 border border-violet-500/30 text-[11px] font-mono text-violet-300">
            <RefreshCw className="w-3 h-3 text-violet-400" />
            <span>Autonomous Pipeline Lifecycle</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How The Platform Works
          </h2>
          <p className="text-xs sm:text-base text-[#A1A1B5]">
            From local git commit to fully verified multi-cloud production in four automated steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] hover:border-white/20 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                    <span className="text-xl sm:text-2xl font-black font-mono text-white/30 group-hover:text-violet-400 transition-colors">
                      {step.number}
                    </span>
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${step.accent}15`,
                        border: `1px solid ${step.accent}40`,
                      }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: step.accent }} />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5 sm:mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#A1A1B5] leading-relaxed mb-3.5 sm:mb-4">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.05] text-[10px] sm:text-[11px] font-mono text-cyan-300/80">
                  {step.tech}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Final Conversion Call To Action ───────────────────────────── */}
      <section className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div
          className="relative p-6 sm:p-12 lg:p-14 rounded-2xl sm:rounded-3xl overflow-hidden text-center space-y-5 sm:space-y-6"
          style={{
            background: 'linear-gradient(135deg, rgba(26,20,48,0.95) 0%, rgba(10,10,20,0.98) 100%)',
            border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 32px 80px -16px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {/* Top specular */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
            <span className="badge badge-emerald">Ready for Production</span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Ready to automate your cloud infrastructure?
            </h2>
            <p className="text-xs sm:text-base text-[#C4C4D4] leading-relaxed">
              Launch your 3D-orchestrated cloud console and execute reproducible Terraform, Ansible, and Kubernetes pipelines in seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 pt-2 w-full max-w-xs sm:max-w-none mx-auto">
            <button
              type="button"
              onClick={() => onNavigate('signin')}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl text-white font-semibold text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                border: '1px solid rgba(139,92,246,0.6)',
              }}
            >
              <span>Sign In to Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl text-gray-200 font-semibold text-base bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/10 transition-all flex items-center justify-center gap-2"
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
