import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  loadingText,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-input text-sm px-5 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#07070D] disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-950/50 hover:shadow-violet-600/20 hover:-translate-y-0.5 active:translate-y-0 focus:ring-violet-500 border border-violet-400/20",
    secondary: "bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 active:bg-white/5 focus:ring-white/20",
    outline: "bg-transparent hover:bg-white/5 text-gray-200 border border-white/15 hover:border-white/30 focus:ring-violet-500",
    ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white focus:ring-violet-500",
    destructive: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 focus:ring-red-500",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
};
