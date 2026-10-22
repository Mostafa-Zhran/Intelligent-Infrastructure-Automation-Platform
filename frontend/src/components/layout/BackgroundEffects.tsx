import React from 'react';

export const BackgroundEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base dark void */}
      <div className="absolute inset-0 bg-[#07070D]" />

      {/* 2. Engineering blueprint grid */}
      <div className="absolute inset-0 bg-engineering-grid opacity-80" />

      {/* 3. Crosshair dot matrix */}
      <div className="absolute inset-0 bg-crosshair-pattern opacity-55" />

      {/* 4. Animated radar sweep beam */}
      <div className="absolute inset-x-0 h-36 bg-gradient-to-b from-transparent via-cyan-500/[0.05] to-transparent radar-sweep-beam pointer-events-none" />

      {/* 5. Violet nebula — top-left, animated drift */}
      <div
        className="absolute -top-[15%] -left-[5%] w-[700px] h-[700px] rounded-full blur-[160px] animate-glow-drift animate-glow-pulse"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.32) 0%, rgba(99,102,241,0.18) 40%, transparent 75%)' }}
      />

      {/* 6. Cyan nebula — bottom-right, opposite drift phase */}
      <div
        className="absolute -bottom-[15%] -right-[5%] w-[750px] h-[750px] rounded-full blur-[180px] animate-glow-pulse delay-300"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(56,189,248,0.12) 40%, transparent 75%)', animationDelay: '2s' }}
      />

      {/* 7. Center indigo ambient fill — subtle depth */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[200px] opacity-12"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
      />

      {/* 8. Top specular highlight — edge catch along very top */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-cyan-400/20" />

      {/* 9. Engineering coordinate watermarks */}
      <div className="absolute bottom-20 right-8 hidden xl:block font-mono text-[9px] text-white/10 tracking-widest uppercase text-right leading-relaxed">
        ZONE: CLOUD-EAST-01<br />
        REGISTRY: K8S-PROD-STABLE<br />
        CLUSTER: CTRL-PLANE-v1.31
      </div>
      <div className="absolute bottom-20 left-8 hidden xl:block font-mono text-[9px] text-cyan-400/15 tracking-widest uppercase leading-relaxed">
        PIPELINE: CI-08F2A<br />
        STATUS: ALL-SYSTEMS-NOMINAL<br />
        UPTIME: 99.99%
      </div>

      {/* 10. Radial vignette — focus toward center */}
      <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(7,7,13,0.9)]" />
    </div>
  );
};
