import React from 'react';

export const BackgroundEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base dark void background */}
      <div className="absolute inset-0 bg-[#07070D]" />

      {/* 2. Layered Engineering Blueprint Grid */}
      <div className="absolute inset-0 bg-engineering-grid opacity-75" />

      {/* 3. Crosshair coordinate matrix */}
      <div className="absolute inset-0 bg-crosshair-pattern opacity-60" />

      {/* 4. Subtle Animated Radar Beam Sweep Line */}
      <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-cyan-500/[0.04] to-transparent radar-sweep-beam pointer-events-none" />

      {/* 5. Restrained Violet Glow (Top-left & brand zone) */}
      <div
        className="absolute -top-[10%] left-[5%] w-[650px] h-[650px] rounded-full blur-[150px] opacity-25 bg-gradient-to-br from-violet-600 via-indigo-700 to-transparent"
      />

      {/* 6. Restrained Cyan Glow (Bottom-right & telemetry zone) */}
      <div
        className="absolute -bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[170px] opacity-20 bg-gradient-to-tl from-cyan-500 via-blue-700 to-transparent"
      />

      {/* 7. Center Ambient Indigo Pulse */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] rounded-full blur-[180px] opacity-15 bg-indigo-600"
      />

      {/* 8. Technical grid coordinates watermark (DevOps Command Center aesthetic) */}
      <div className="absolute top-20 left-6 hidden xl:block font-mono text-[9px] text-white/15 tracking-widest uppercase">
      </div>
      <div className="absolute bottom-16 right-6 hidden xl:block font-mono text-[9px] text-white/15 tracking-widest uppercase text-right">
        ZONE: CLOUD-EAST-01 // REGISTRY: K8S-PROD-STABLE
      </div>
      <div className="absolute top-20 right-6 hidden xl:block font-mono text-[9px] text-cyan-400/20 tracking-widest uppercase text-right">
      </div>

      {/* 9. Radial Vignette Frame for smooth focus on cards */}
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(7,7,13,0.85)]" />
    </div>
  );
};
