import React from 'react';
import { GitBranch, Box, Layers, Container, Cpu, ShieldCheck, RefreshCw, Globe2, CheckCircle2, Activity } from 'lucide-react';

export const PipelineVisual: React.FC = () => {
  const pipelineSteps = [
    { 
      name: 'Git', 
      detail: 'main:8f9a2b',
      icon: GitBranch, 
      color: 'text-amber-400', 
      border: 'border-amber-400/40', 
      bg: 'bg-amber-400/10',
      status: 'Syncd'
    },
    { 
      name: 'Terraform', 
      detail: '14 to add',
      icon: Box, 
      color: 'text-violet-400', 
      border: 'border-violet-400/40', 
      bg: 'bg-violet-400/10',
      status: 'Planned'
    },
    { 
      name: 'Ansible', 
      detail: '4 plays ok',
      icon: Layers, 
      color: 'text-cyan-400', 
      border: 'border-cyan-400/40', 
      bg: 'bg-cyan-400/10',
      status: 'Applied'
    },
    { 
      name: 'Docker', 
      detail: 'cache 99%',
      icon: Container, 
      color: 'text-blue-400', 
      border: 'border-blue-400/40', 
      bg: 'bg-blue-400/10',
      status: 'Built'
    },
    { 
      name: 'Kubernetes', 
      detail: '12/12 pods',
      icon: Cpu, 
      color: 'text-emerald-400', 
      border: 'border-emerald-400/40', 
      bg: 'bg-emerald-400/10',
      status: 'Ready'
    },
  ];

  const benefits = [
    {
      title: 'Continuous Reconcile',
      desc: 'Automatic drift detection and declarative sync across multi-cloud regions with zero config drift.',
      icon: RefreshCw,
      badge: 'Zero Drift',
      badgeColor: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/40',
      stat: '99.99% sync',
    },
    {
      title: 'Secure Infrastructure',
      desc: 'Automated IAM policy hardening, secret vault isolation, and least-privilege role binding.',
      icon: ShieldCheck,
      badge: 'mTLS & OIDC',
      badgeColor: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40',
      stat: 'SOC2 Type II',
    },
    {
      title: 'Global Deployment',
      desc: 'Instant blue/green orchestration with progressive canary rollouts in milliseconds.',
      icon: Globe2,
      badge: 'Edge CDN',
      badgeColor: 'text-violet-400 bg-violet-950/50 border-violet-500/40',
      stat: '< 150ms rollout',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between py-2 lg:py-6">
      {/* Top Header Label & Version */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/40 text-xs font-mono text-violet-300 shadow-lg shadow-violet-950/40">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Automated DevOps</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          Fill a form. <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            We run the pipeline.
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-[#A1A1B5] leading-relaxed max-w-xl">
          Deploy enterprise-grade cloud infrastructure with Terraform, Ansible, Jenkins, Docker, and Kubernetes through one guided workflow.
        </p>

        {/* Visual Pipeline Rail: Git -> Terraform -> Ansible -> Docker -> Kubernetes */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                Active Automation Rail
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>CI/CD Flow Verified</span>
            </div>
          </div>

          <div className="relative p-4 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md shadow-2xl">
            {/* Specular hairline */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="flex items-center justify-between relative z-10 overflow-x-auto pb-1 sm:pb-0 gap-2 sm:gap-0">
              {pipelineSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.name}>
                    <div className="flex flex-col items-center flex-shrink-0 group cursor-default">
                      <div className={`w-11 h-11 rounded-xl ${step.bg} ${step.border} border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] shadow-lg`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <span className="text-xs font-semibold text-gray-200 mt-2">
                        {step.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#A1A1B5]/80">
                        {step.detail}
                      </span>
                      <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[9px] font-mono text-emerald-400 font-semibold">{step.status}</span>
                      </div>
                    </div>

                    {/* Animated connector line between steps */}
                    {idx < pipelineSteps.length - 1 && (
                      <div className="flex-1 mx-2 h-[2px] bg-white/10 relative overflow-hidden min-w-[20px] rounded-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-cyan-400 to-indigo-500 w-1/2 animate-pipeline-shimmer" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Three benefit rows */}
      <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1B5]">
            Enterprise Platform Guarantees
          </span>
          <span className="text-[10px] font-mono text-violet-400">
            Automated SLA 99.99%
          </span>
        </div>

        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="p-3.5 rounded-xl glass-panel-subtle hover:border-white/25 transition-all duration-200 flex items-start gap-3.5 group shadow-sm hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-violet-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-colors flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-white tracking-wide">
                      {benefit.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#A1A1B5]/70 hidden sm:inline">
                      {benefit.stat}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${benefit.badgeColor}`}>
                    {benefit.badge}
                  </span>
                </div>
                <p className="text-[12px] text-[#A1A1B5] mt-0.5 leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
