import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { PageId } from '../types';

interface ResetPasswordPageProps {
  onNavigate: (page: PageId) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigate,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Must contain at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1300);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12">
      <GlassCard glow="cyan" size="lg" className="p-6 sm:p-8">
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-violet-900/40 mb-3 flex items-center justify-center">
                <div className="w-full h-full bg-[#0E0E18] rounded-[15px] flex items-center justify-center">
                  <Lock className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Set new password
              </h2>
              <p className="text-sm text-[#A1A1B5] mt-1.5 max-w-xs mx-auto">
                Choose a strong password you have not used before.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1">
                <PasswordInput
                  label="New password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                    if (confirmPassword && e.target.value !== confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                    } else if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  error={errors.newPassword}
                  required
                  autoComplete="new-password"
                />

                {/* Live password-strength indicator */}
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <PasswordInput
                label="Confirm new password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
              />

              {errors.confirmPassword && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  loadingText="Updating…"
                >
                  Update password
                </Button>
              </div>
            </form>

            {/* Secondary link: Link invalid or expired? Request a new one */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors focus:outline-none focus:underline"
              >
                Link invalid or expired? Request a new one
              </button>
            </div>
          </>
        ) : (
          /* Success state: success icon + “Password Updated” */
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/60">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">Password Updated</h3>
              <p className="text-xs text-[#A1A1B5] max-w-xs mx-auto leading-relaxed pt-1">
                Your cryptographic token credentials have been safely renewed across all platform services.
              </p>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-left text-xs space-y-1 text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>All active legacy tokens terminated immediately.</span>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => onNavigate('signin')}
              >
                <span>Proceed to Sign in</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
