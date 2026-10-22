import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  loadingText,
  icon,
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const sizeStyles: Record<string, string> = {
    sm: 'text-xs px-3.5 py-2 min-h-[36px] rounded-xl',
    md: 'text-sm px-5 py-2.5 min-h-[44px] rounded-xl',
    lg: 'text-sm px-6 py-3 min-h-[48px] rounded-2xl',
  };

  const baseStyles = `relative inline-flex items-center justify-center font-semibold ${sizeStyles[size]} transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070D] disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden`;

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      color: '#fff',
      border: '1px solid rgba(139,92,246,0.4)',
      boxShadow: '0 8px 24px -6px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
    },
    secondary: {
      background: 'rgba(255,255,255,0.07)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
    outline: {
      background: 'transparent',
      color: '#E5E5F5',
      border: '1px solid rgba(255,255,255,0.16)',
    },
    ghost: {
      background: 'transparent',
      color: '#C4C4D4',
      border: '1px solid transparent',
    },
    destructive: {
      background: 'rgba(239,68,68,0.12)',
      color: '#FCA5A5',
      border: '1px solid rgba(239,68,68,0.3)',
    },
  };

  const hoverClassMap: Record<string, string> = {
    primary: 'hover:brightness-110 active:scale-[0.98] active:brightness-95',
    secondary: 'hover:bg-white/[0.12] hover:border-white/20 active:scale-[0.98]',
    outline: 'hover:bg-white/[0.07] hover:border-white/28 active:scale-[0.98]',
    ghost: 'hover:bg-white/[0.07] hover:text-white active:scale-[0.98]',
    destructive: 'hover:bg-red-500/20 hover:border-red-500/50 active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${hoverClassMap[variant]} ${className}`}
      style={variantStyles[variant]}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Specular sheen overlay for primary */}
      {variant === 'primary' && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
        />
      )}

      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap relative z-10">
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap relative z-10">
          {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
          <span className="inline-flex items-center justify-center gap-2">{children}</span>
        </span>
      )}
    </button>
  );
};
