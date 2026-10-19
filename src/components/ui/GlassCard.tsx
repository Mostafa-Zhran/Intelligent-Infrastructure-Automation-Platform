import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'violet' | 'cyan';
  size?: 'md' | 'lg';
}

const glowStyles = {
  none: {
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 24px 52px -12px rgba(0,0,0,0.75), 0 8px 24px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  violet: {
    border: '1px solid rgba(139,92,246,0.3)',
    boxShadow: '0 28px 56px -12px rgba(0,0,0,0.82), 0 0 0 1px rgba(139,92,246,0.18), 0 0 40px -12px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
  },
  cyan: {
    border: '1px solid rgba(56,189,248,0.28)',
    boxShadow: '0 28px 56px -12px rgba(0,0,0,0.82), 0 0 0 1px rgba(56,189,248,0.15), 0 0 40px -12px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  size = 'lg',
}) => {
  const roundedClass = size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
  const styles = glowStyles[glow];

  return (
    <div
      className={`glass-panel ${roundedClass} relative overflow-hidden transition-all duration-300 ${className}`}
      style={styles}
    >
      {/* Precision specular top hairline */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 35%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.18) 65%, transparent 100%)' }}
      />

      {/* Subtle inner corner catch — bottom-right */}
      <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-30 rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 80% 80%, rgba(139,92,246,0.15) 0%, transparent 60%)' }}
        />
      </div>

      {children}
    </div>
  );
};
