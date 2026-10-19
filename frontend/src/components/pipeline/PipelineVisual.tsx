import React from 'react';
import {
  GitBranch, Box, Layers, Container, Cpu,
  ShieldCheck, RefreshCw, Globe2, CheckCircle2, Activity
} from 'lucide-react';

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

const benefits = [
  {
    title: 'Continuous Reconcile',
    desc: 'Automatic drift detection and declarative sync across multi-cloud regions.',
    icon: RefreshCw,
    badge: 'Zero Drift',
    badgeClass: 'badge-cyan',
    stat: '99.99% sync',
    statColor: '#22D3EE',
    delay: 'delay-75',
  },
  {
    title: 'Secure Infrastructure',
    desc: 'Automated IAM hardening, secret vault isolation, and least-privilege binding.',
    icon: ShieldCheck,
    badge: 'mTLS + OIDC',
    badgeClass: 'badge-emerald',
    stat: 'SOC2 Type II',
    statColor: '#34D399',
    delay: 'delay-150',
  },
  {
    title: 'Global Deployment',
    desc: 'Instant blue/green orchestration with progressive canary rollouts.',
    icon: Globe2,
    badge: 'Edge CDN',
    badgeClass: 'badge-violet',
    stat: '< 150ms rollout',
    statColor: '#A78BFA',
    delay: 'delay-200',
  },
];

export const PipelineVisual: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col justify-between py-2 lg:py-4 animate-slideUpFade">

      {/* ── Hero Heading ────────────────────────────────────── */}
      <div>
        <div className="mb-2">
          <span className="badge badge-violet mb-3 inline-flex">
            <Activity className="w-2.5 h-2.5" />
            CI/CD AUTOMATION PLATFORM
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-white leading-[1.1]">
          Fill a form.{' '}
          <span
            className="text-gradient-violet"
            style={{ display: 'inline-block' }}
          >
            We run the pipeline.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-[15px] text-[#C4C4D4] leading-relaxed max-w-lg">
          Deploy enterprise-grade cloud infrastructure with Terraform, Ansible, Jenkins, Docker, and Kubernetes through one guided workflow.
        </p>

        {/* ── Pipeline Rail ────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1B5]">
                Active Automation Rail
              </span>
            </div>
            <span className="badge badge-emerald">
              CI/CD Verified
            </span>
          </div>

          {/* Pipeline card */}
          <div
            className="relative p-4 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10,10,18,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 48px -12px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Top specular */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent pointer-events-none" />

            {/* Step nodes + connectors */}
            <div className="flex items-center justify-between relative z-10 overflow-x-auto pb-1 sm:pb-0 gap-3 sm:gap-0 scrollbar-none">
              {pipelineSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.name}>
                    <div className="flex flex-col items-center flex-shrink-0 group cursor-default animate-slideUpFade" style={{ animationDelay: `${idx * 80}ms` }}>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-md"
                        style={{
                          background: step.bg,
                          border: `1px solid ${step.border}`,
                          boxShadow: `0 4px 16px -4px ${step.glow}`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                      <span className="text-xs font-semibold text-white mt-2 tracking-tight">{step.name}</span>
                      <span className="text-[10px] font-mono tabular-nums mt-0.5" style={{ color: step.color, opacity: 0.75 }}>{step.detail}</span>
                      <div
                        className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[9px] font-mono text-emerald-400 font-semibold tracking-wide">{step.status}</span>
                      </div>
                    </div>

                    {/* Animated connector */}
                    {idx < pipelineSteps.length - 1 && (
                      <div className="flex-1 mx-1.5 h-[2px] bg-white/[0.06] relative overflow-hidden min-w-[16px] rounded-full">
                        <div
                          className="absolute inset-0 animate-pipeline-shimmer rounded-full"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.9), rgba(34,211,238,0.9), transparent)', width: '60%' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Ambient bottom glow */}
            <div
              className="absolute bottom-0 inset-x-0 h-12 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(99,102,241,0.06), transparent)' }}
            />
          </div>
        </div>
      </div>

      {/* ── Enterprise Guarantees ─────────────────────────── */}
      <div className="mt-7 space-y-2 pt-6 border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1B5]">
            Enterprise Platform Guarantees
          </span>
          <span className="text-[10px] font-mono text-violet-300 tabular-nums font-semibold">
            Automated SLA 99.99%
          </span>
        </div>

        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className={`group relative p-3.5 rounded-xl transition-all duration-200 animate-slideUpFade ${benefit.delay}`}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)';
              }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="p-2 rounded-xl flex-shrink-0 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: benefit.statColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-[13px] font-semibold text-white tracking-tight">{benefit.title}</h4>
                      <span className={`badge ${benefit.badgeClass}`}>{benefit.badge}</span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums font-semibold flex-shrink-0" style={{ color: benefit.statColor }}>
                      {benefit.stat}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#A1A1B5] leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
