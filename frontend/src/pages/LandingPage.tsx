import React from 'react';
import {
  ArrowRight, Zap, CheckCircle2, ShieldCheck, RefreshCw,
  Globe2, GitBranch, Box, Layers, Container, Cpu, Sparkles, ChevronRight
} from 'lucide-react';
import { PageId } from '../types';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
  isAuthenticated?: boolean;
}

const pipelineSteps = [
  {
    name: 'Git',
    detail: 'main:8f9a2b',
    icon: GitBranch,
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.35)',
    glow: 'rgba(251,191,36,0.2)',
    status: 'Synced',
  },
  {
    name: 'Terraform',
    detail: '14 to add',
    icon: Box,
    color: '#A78BFA',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.35)',
    glow: 'rgba(139,92,246,0.2)',
    status: 'Planned',
  },
  {
    name: 'Ansible',
    detail: '4 plays ok',
    icon: Layers,
    color: '#22D3EE',
    bg: 'rgba(34,211,238,0.1)',
    border: 'rgba(34,211,238,0.35)',
    glow: 'rgba(34,211,238,0.2)',
    status: 'Applied',
  },
  {
    name: 'Docker',
    detail: 'cache 99%',
    icon: Container,
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.35)',
    glow: 'rgba(96,165,250,0.2)',
    status: 'Built',
  },
  {
    name: 'Kubernetes',
    detail: '12/12 pods',
    icon: Cpu,
    color: '#34D399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.35)',
    glow: 'rgba(52,211,153,0.2)',
    status: 'Ready',
  },
];

const features = [
  {
    title: 'Continuous Reconcile',
    desc: 'Automatic drift detection and declarative sync across multi-cloud regions with zero latency overhead.',
    icon: RefreshCw,
    badge: 'Zero Drift',
    badgeClass: 'badge-cyan',
    stat: '99.99% sync',
    statColor: '#22D3EE',
  },
  {
    title: 'Secure Infrastructure',
    desc: 'Automated IAM hardening, secret vault isolation, and least-privilege binding out of the box.',
    icon: ShieldCheck,
    badge: 'mTLS + OIDC',
    badgeClass: 'badge-emerald',
    stat: 'SOC2 Type II',
    statColor: '#34D399',
  },
  {
    title: 'Global Deployment',
    desc: 'Instant blue/green orchestration with progressive canary rollouts and instant rollback triggers.',
    icon: Globe2,
    badge: 'Edge CDN',
    badgeClass: 'badge-violet',
    stat: '< 150ms rollout',
    statColor: '#A78BFA',
  },
  {
    title: 'Automated Verification',
    desc: 'Automated syntax parsing, cost estimation, and compliance checks before every pipeline execution.',
    icon: CheckCircle2,
    badge: 'Policy as Code',
    badgeClass: 'badge-amber',
    stat: '100% audited',
    statColor: '#FCD34D',
  },
];

const metrics = [
  { label: 'Platform Availability SLA', value: '99.99%' },
  { label: 'Median Pipeline Runtime', value: '< 45s' },
  { label: 'Cloud Resources Synced', value: '14,000+' },
  { label: 'Automated Checks per Run', value: '38' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  isAuthenticated = false,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-16 sm:space-y-24 animate-fadeIn">
      {/* ── 1. Hero Section ────────────────────────────────────────── */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/40 border border-violet-500/30 text-xs text-violet-300 shadow-sm animate-scaleIn">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold tracking-wide uppercase font-mono text-[11px]">Intelligent Infrastructure Automation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Fill a form.{' '}
          <span className="text-gradient-violet block sm:inline">
            We run the pipeline.
          </span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl text-[#C4C4D4] max-w-2xl mx-auto leading-relaxed">
          Deploy enterprise-grade cloud infrastructure with Terraform, Ansible, Jenkins, Docker, and Kubernetes through one unified, guided workflow.
        </p>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'profile' : 'signin')}
            className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl text-white font-semibold shadow-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 group hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              border: '1px solid rgba(139,92,246,0.5)',
              boxShadow: '0 8px 24px -4px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <span>{isAuthenticated ? 'Open Dashboard' : 'Sign in to Console'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl text-gray-200 font-semibold bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Create Account</span>
            </button>
          )}
        </div>

        {/* Security badge line */}
        <div className="pt-2 flex items-center justify-center gap-6 text-xs text-[#A1A1B5] font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Zero Configuration
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Automated Validation
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
            SOC2 Ready
          </span>
        </div>
      </section>

      {/* ── 2. Interactive Automation Pipeline Rail ────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <h2 className="text-xs font-mono uppercase tracking-widest text-white font-semibold">
              Live Automation Pipeline Architecture
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-emerald">CI/CD Verified</span>
            <span className="text-[11px] font-mono text-[#A1A1B5]">v2.4 Core Engine</span>
          </div>
        </div>

        <div
          className="relative p-6 sm:p-8 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,10,18,0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px -16px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {/* Top specular reflection */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

          {/* Pipeline Nodes */}
          <div className="flex items-center justify-between relative z-10 overflow-x-auto pb-2 sm:pb-0 gap-4 sm:gap-2 scrollbar-none">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.name}>
                  <div className="flex flex-col items-center flex-shrink-0 group cursor-default">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-lg"
                      style={{
                        background: step.bg,
                        border: `1px solid ${step.border}`,
                        boxShadow: `0 8px 24px -4px ${step.glow}`,
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: step.color }} />
                    </div>
                    <span className="text-xs font-semibold text-white mt-2.5 tracking-tight">{step.name}</span>
                    <span className="text-[10px] font-mono tabular-nums mt-0.5" style={{ color: step.color, opacity: 0.85 }}>
                      {step.detail}
                    </span>
                    <div
                      className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold tracking-wide">
                        {step.status}
                      </span>
                    </div>
                  </div>

                  {/* Connectors */}
                  {idx < pipelineSteps.length - 1 && (
                    <div className="flex-1 mx-2 h-[2px] bg-white/[0.08] relative overflow-hidden min-w-[24px] rounded-full">
                      <div
                        className="absolute inset-0 animate-pipeline-shimmer rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.9), rgba(34,211,238,0.9), transparent)',
                          width: '60%',
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Features & Benefits Grid ────────────────────────────── */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="badge badge-cyan">Built for Reliability</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Enterprise Cloud Guarantees
          </h2>
          <p className="text-sm text-[#A1A1B5]">
            Everything needed to automate modern DevOps pipelines with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-5 sm:p-6 rounded-2xl bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.07] hover:border-white/15 transition-all duration-200 group flex items-start gap-4"
              >
                <div
                  className="p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: feat.statColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {feat.title}
                    </h3>
                    <span className={`badge ${feat.badgeClass}`}>{feat.badge}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#A1A1B5] leading-relaxed mb-3">
                    {feat.desc}
                  </p>
                  <span
                    className="text-xs font-mono font-semibold tabular-nums inline-flex items-center gap-1"
                    style={{ color: feat.statColor }}
                  >
                    <span>Metric:</span>
                    <span>{feat.stat}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Platform Metrics Ribbon ─────────────────────────────── */}
      <section
        className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-violet-950/20 via-indigo-950/20 to-cyan-950/20 border border-white/10"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {m.value}
              </div>
              <div className="text-xs text-[#A1A1B5] font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ───────────────────────────────── */}
      <section
        className="relative p-8 sm:p-12 rounded-3xl overflow-hidden text-center space-y-6"
        style={{
          background: 'linear-gradient(135deg, rgba(22,18,38,0.95) 0%, rgba(13,13,26,0.95) 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 24px 64px -16px rgba(124,58,237,0.25)',
        }}
      >
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Ready to automate your cloud infrastructure?
          </h2>
          <p className="text-sm text-[#C4C4D4] leading-relaxed">
            Access your automated pipeline console and orchestrate multi-cloud environments in minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('signin')}
            className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 rounded-xl text-white font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              border: '1px solid rgba(139,92,246,0.5)',
            }}
          >
            <span>Sign In to Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('signup')}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl text-gray-200 font-semibold bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <span>Create New Account</span>
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </section>
    </div>
  );
};
