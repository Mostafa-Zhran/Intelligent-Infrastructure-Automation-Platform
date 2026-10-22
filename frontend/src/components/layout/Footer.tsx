import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Lock, Activity, X, CheckCircle2, ChevronRight } from 'lucide-react';

type ModalKey = 'privacy' | 'terms' | 'security' | 'status';

const modalData: Record<ModalKey, { title: string; tag: string; description: string; points: string[] }> = {
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
      'Control Plane (API & Auth): 100% Operational — Latency: 12ms avg',
      'CI/CD Pipeline Runners: 99.99% Operational — Active Nodes: 128',
      'Kubernetes Cluster Ingress: 100% Operational — Zero Drift Active',
    ],
  },
};

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!activeModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeModal]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeModal]);

  const modal = activeModal ? modalData[activeModal] : null;

  return (
    <>
      <footer className="w-full border-t border-white/[0.07] py-4 sm:py-5 z-20 relative select-none">
        {/* Top gradient hairline */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/25 to-cyan-400/20 pointer-events-none" />
        {/* Subtle footer background */}
        <div className="absolute inset-0 bg-[#07070D]/90 backdrop-blur-xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">

            {/* Left: Brand + Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.85) 0%, rgba(79,70,229,0.8) 100%)', border: '1px solid rgba(139,92,246,0.35)' }}
                >
                  <Terminal className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-white tracking-tight text-xs">Automated DevOps</span>
              </div>

              <span className="text-white/15 select-none hidden sm:inline" aria-hidden="true">|</span>

              <button
                type="button"
                onClick={() => setActiveModal('status')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                title="View real-time system status"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-mono tracking-wide tabular-nums">99.99% SLA</span>
              </button>
            </div>

            {/* Center: Nav links */}
            <nav aria-label="Footer Navigation" className="flex items-center gap-5 text-[11px] text-[#A1A1B5]">
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="hover:text-white transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="hover:text-white transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('security')}
                className="flex items-center gap-1.5 hover:text-cyan-300 text-cyan-400/80 transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
              >
                <Lock className="w-3 h-3" />
                <span>Security</span>
              </button>
            </nav>

            {/* Right: Tag + Copyright */}
            <div className="flex items-center gap-3">
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#A1A1B5]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Shield className="w-3 h-3 text-violet-400" />
                <span>Zero-Trust IAM</span>
              </div>
              <span className="text-[#A1A1B5]/60 font-mono text-[10px] tabular-nums">
                © 2026 Automated DevOps
              </span>
            </div>

          </div>
        </div>
      </footer>

      {/* Modal */}
      {activeModal && modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div
            ref={modalRef}
            className="glass-panel rounded-2xl max-w-lg w-full p-6 sm:p-7 relative animate-scaleIn"
            style={{ border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            {/* Top specular */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl pointer-events-none" />

            {/* Modal header */}
            <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                >
                  <Activity className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 id="modal-title" className="text-base font-bold text-white">{modal.title}</h3>
                    <span className="badge badge-violet">{modal.tag}</span>
                  </div>
                  <p className="text-xs text-[#A1A1B5] mt-0.5 leading-snug">{modal.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#A1A1B5] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 flex-shrink-0 ml-3"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-2.5 my-4">
              {modal.points.map((point, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl flex items-start gap-3 text-xs text-[#C4C4D4] leading-relaxed animate-slideUpFade"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#A1A1B5]">Verified Cryptographic Standard</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  boxShadow: '0 4px 16px -4px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
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
