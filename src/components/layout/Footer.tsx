import React, { useState } from 'react';
import { Terminal, Shield, Lock, Activity, X, CheckCircle2, ChevronRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'security' | 'status' | null>(null);

  const modalData = {
    privacy: {
      title: 'Privacy Policy',
      tag: 'Data Governance',
      description: 'Zero telemetry leakage on customer source code and infrastructure definitions.',
      points: [
        'Application source repositories, Git commits, and container image layers are processed in ephemeral memory and never persisted to multi-tenant disks.',
        'Session tokens and authorization bearer keys expire automatically after 12 hours of inactivity with immediate cryptographic revocation.',
        'Customer infrastructure states managed with Terraform and Kubernetes are encrypted with dedicated AWS/GCP KMS customer-managed keys (CMK).',
      ],
    },
    terms: {
      title: 'Terms of Service',
      tag: 'Service Agreement',
      description: 'Platform infrastructure automation SLAs and deployment policies.',
      points: [
        'Automated DevOps guarantees 99.99% monthly availability for CI/CD automation runners and control-plane dispatchers.',
        'Automated drift reconciliation operates on declarative target states; manual cluster overrides are flagged with immediate alert notifications.',
        'Workspaces are subject to role-based access control (RBAC); audit logs are immutable and exported directly to customer SIEM targets.',
      ],
    },
    security: {
      title: 'Security Whitepaper',
      tag: 'Zero-Trust Architecture',
      description: 'Cryptographic policy enforcement and isolated runner execution.',
      points: [
        'Sandboxed Runners: Every container build and Ansible configuration task runs inside an isolated Firecracker microVM with dedicated network isolation.',
        'Memory Vault: Secrets injected into deployment pipelines are erased with cryptographic zeroization immediately following step completion.',
        'Mutual TLS (mTLS): All intra-service orchestrator communications require mTLS with rotating X.509 certificates.',
      ],
    },
    status: {
      title: 'System Status',
      tag: 'Real-time Telemetry',
      description: 'Live operational health of the platform control plane and edge nodes.',
      points: [
        'Control Plane (API & Auth): 100% Operational (Latency: 12ms)',
        'CI/CD Pipeline Runners: 99.99% Operational (Active Nodes: 128)',
        'Kubernetes Cluster Ingress: 100% Operational (Zero Drift Active)',
      ],
    },
  };

  return (
    <>
      <footer className="w-full border-t border-white/10 bg-[#07070D]/90 backdrop-blur-md py-4 sm:py-5 z-20 relative select-none">
        {/* Subtle Specular Top Gradient Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-cyan-400/30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            {/* Left: Brand Mark & Live Operational Telemetry */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-sm">
                  <div className="w-full h-full bg-[#0E0E18] rounded-[5px] flex items-center justify-center">
                    <Terminal className="w-3 h-3 text-cyan-400" />
                  </div>
                </div>
                <span className="font-semibold text-white tracking-tight text-xs">
                  Automated DevOps
                </span>
              </div>

              <span className="text-white/20 select-none hidden sm:inline">|</span>

              {/* Live Status Telemetry Pill */}
              <button
                onClick={() => setActiveModal('status')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60 transition-colors"
                title="View real-time system status"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
                <span className="text-[11px] font-mono tracking-wide">Systems 99.99%</span>
              </button>
            </div>

            {/* Center: Clean Modern Navigation Links */}
            <nav aria-label="Footer Navigation" className="flex items-center gap-5 sm:gap-6 text-xs text-[#A1A1B5]">
              <button
                onClick={() => setActiveModal('privacy')}
                className="hover:text-white transition-colors focus:outline-none focus:underline"
              >
                Privacy Policy
              </button>

              <button
                onClick={() => setActiveModal('terms')}
                className="hover:text-white transition-colors focus:outline-none focus:underline"
              >
                Terms of Service
              </button>

              <button
                onClick={() => setActiveModal('security')}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1 text-cyan-400/90 focus:outline-none focus:underline"
              >
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Security Whitepaper</span>
              </button>
            </nav>

            {/* Right: Security Tag & Minimal Copyright */}
            <div className="flex items-center gap-3 text-right">
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300">
                <Shield className="w-3 h-3 text-violet-400" />
                <span>Zero-Trust IAM</span>
              </div>

              <span className="text-[#A1A1B5]/70 font-mono text-[11px]">
                © 2026 Automated DevOps
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Glassmorphic Policy / Security Modal */}
      {activeModal && modalData[activeModal] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel rounded-glass max-w-lg w-full p-6 sm:p-7 border border-white/20 shadow-2xl relative">
            {/* Top Modal Header */}
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-950/50 border border-violet-500/30 text-violet-400">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {modalData[activeModal].title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {modalData[activeModal].tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1B5] mt-0.5">
                    {modalData[activeModal].description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-2.5 my-4">
              {modalData[activeModal].points.map((point, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#A1A1B5]">
                Verified Cryptographic Standard
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-violet-950/50"
              >
                <span>Acknowledge</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
