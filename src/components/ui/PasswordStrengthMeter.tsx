import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export type StrengthLevel = 'Empty' | 'Weak' | 'Fair' | 'Strong';

export function calculatePasswordStrength(password: string): {
  score: number;
  label: StrengthLevel;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      hasLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false,
    };
  }

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label: StrengthLevel = 'Weak';
  if (score >= 4) {
    label = 'Strong';
  } else if (score >= 2) {
    label = 'Fair';
  } else {
    label = 'Weak';
  }

  return {
    score,
    label,
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { label, hasLength, hasUpper, hasLower, hasNumber } = calculatePasswordStrength(password);

  if (!password) return null;

  const getBarColor = (index: number) => {
    if (label === 'Weak') {
      return index === 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10';
    }
    if (label === 'Fair') {
      return index <= 1 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-white/10';
    }
    if (label === 'Strong') {
      return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    }
    return 'bg-white/10';
  };

  const getLabelColor = () => {
    switch (label) {
      case 'Weak':
        return 'text-red-400';
      case 'Fair':
        return 'text-amber-400';
      case 'Strong':
        return 'text-emerald-400';
      default:
        return 'text-[#A1A1B5]';
    }
  };

  const rules = [
    { label: '8+ characters', met: hasLength },
    { label: 'Uppercase letter', met: hasUpper },
    { label: 'Lowercase letter', met: hasLower },
    { label: 'Number', met: hasNumber },
  ];

  return (
    <div className="w-full space-y-2 mt-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[#A1A1B5]">Password strength:</span>
        <span className={`font-semibold tracking-wide ${getLabelColor()}`}>{label}</span>
      </div>

      {/* 3-segment progress indicator */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
        <div className={`rounded-full transition-all duration-300 ${getBarColor(0)}`} />
        <div className={`rounded-full transition-all duration-300 ${getBarColor(1)}`} />
        <div className={`rounded-full transition-all duration-300 ${getBarColor(2)}`} />
      </div>

      {/* Compact criteria checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              rule.met ? 'text-emerald-400' : 'text-[#A1A1B5]/70'
            }`}
          >
            {rule.met ? (
              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-white/30 flex-shrink-0" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
