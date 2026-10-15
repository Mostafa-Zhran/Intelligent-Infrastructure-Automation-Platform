import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'violet' | 'cyan';
  size?: 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  size = 'lg',
}) => {
  const roundedClass = size === 'lg' ? 'rounded-glass-lg' : 'rounded-glass';
  
  const glowStyles = {
    none: 'border-white/10 hover:border-white/20',
    violet: 'shadow-[0_0_60px_-15px_rgba(139,92,246,0.3)] border-violet-500/30 hover:border-violet-500/50',
    cyan: 'shadow-[0_0_60px_-15px_rgba(56,189,248,0.3)] border-cyan-500/30 hover:border-cyan-500/50',
  };

  return (
    <div
      className={`glass-panel tech-corners ${roundedClass} ${glowStyles[glow]} relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Top dual-tone specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-cyan-400/40 pointer-events-none" />

      {/* Subtle corner micro-accents */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-white/20 pointer-events-none rounded-tl-[2px]" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/20 pointer-events-none rounded-tr-[2px]" />

      {children}
    </div>
  );
};
