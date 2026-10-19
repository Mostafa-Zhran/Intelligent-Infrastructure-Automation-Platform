import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { InputField } from './InputField';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  helperText?: string;
  showLockIcon?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({
  label,
  error,
  helperText,
  showLockIcon = true,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <InputField
      ref={ref}
      label={label}
      type={showPassword ? 'text' : 'password'}
      error={error}
      helperText={helperText}
      icon={showLockIcon ? <Lock className="w-4 h-4" /> : undefined}
      rightElement={
        <button
          type="button"
          onClick={toggleVisibility}
          className="text-gray-400 hover:text-white transition-colors w-9 h-9 flex items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-violet-400" />
          ) : (
            <Eye className="w-4 h-4 hover:text-gray-200" />
          )}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
