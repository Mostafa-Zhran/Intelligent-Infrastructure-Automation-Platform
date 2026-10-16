import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(({
  label,
  error,
  helperText,
  icon,
  rightElement,
  id,
  className = '',
  required,
  ...props
}, ref) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      <div className="flex justify-between items-center">
        <label 
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-gray-300"
        >
          {label} {required && <span className="text-violet-400">*</span>}
        </label>
      </div>

      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1B5] pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          required={required}
          className={`glass-input w-full text-white placeholder-[#A1A1B5]/50 text-sm rounded-input py-2.5 
            ${icon ? 'pl-10' : 'pl-3.5'} 
            ${rightElement ? 'pr-11' : 'pr-3.5'}
            ${error ? '!border-red-500/70 focus:!ring-red-500/30' : ''}
            ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <div id={errorId} className="flex items-center gap-1.5 text-xs text-red-400 mt-0.5 animate-fadeIn" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[#A1A1B5] mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

InputField.displayName = 'InputField';
