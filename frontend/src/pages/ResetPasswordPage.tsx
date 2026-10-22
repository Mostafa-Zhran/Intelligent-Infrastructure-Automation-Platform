import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { PageId } from '../types';

import { authApi } from '../services/api';

interface ResetPasswordPageProps {
  onNavigate: (page: PageId) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigate,
}) => {
  const [token, setToken] = useState(() => {
    return new URLSearchParams(window.location.search).get('token') || '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!token.trim()) {
      setSubmitError('Password reset link is invalid or token is missing. Please check your email.');
      return;
    }

    if (!validate()) return;

    setIsLoading(true);

    try {
      await authApi.resetPassword({
        token: token.trim(),
        password: newPassword,
        confirmPassword,
      });
      // Clear consumed token query parameter from URL so refresh doesn't retain old token
      window.history.replaceState({}, document.title, '/reset-password');
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Password reset failed. The reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 animate-slideUpFade">
      <GlassCard glow="cyan" size="lg" className="p-6 sm:p-8">
        {!isSuccess ? (
          <>
            {/* Top Quick Back Action */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="inline-flex items-center gap-1.5 text-xs text-[#A1A1B5] hover:text-white transition-all py-1.5 px-2.5 rounded-lg group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                <span>Return to sign in</span>
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <div
                className="mx-auto w-12 h-12 rounded-2xl mb-4 flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.8) 0%, rgba(37,99,235,0.75) 100%)', border: '1px solid rgba(56,189,248,0.4)', boxShadow: '0 8px 24px -6px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Set new password
              </h2>
              <p className="text-sm text-[#C4C4D4] mt-1.5 max-w-xs mx-auto">
                Choose a strong password you have not used before.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              {!new URLSearchParams(window.location.search).get('token') && (
                <div className="space-y-1">
                  <label htmlFor="reset-token-input" className="text-xs font-medium text-gray-300">Reset Security Token</label>
                  <input
                    id="reset-token-input"
                    type="text"
                    placeholder="Enter token from email or logs"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="glass-input w-full text-white placeholder-gray-400 text-sm rounded-xl py-2.5 px-3.5"
                  />
                </div>
              )}
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

            {/* Footer Navigation */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-2">
              <p className="text-xs text-gray-300">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 py-1 px-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>Return to Sign in</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-violet-300 hover:text-violet-200 py-1 px-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  Link invalid or expired? Request a new one
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Success state: symmetric with ForgotPasswordPage */
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/60">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">Password Updated</h3>
              <p className="text-xs text-[#A1A1B5] max-w-xs mx-auto leading-relaxed pt-1">
                Your cryptographic credentials have been safely renewed across all platform services.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left text-xs space-y-1 text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>All active legacy tokens terminated immediately.</span>
            </div>

            <div className="pt-3 space-y-3">
              <Button
                variant="primary"
                className="w-full group shadow-lg shadow-indigo-950/50 hover:shadow-cyan-500/20"
                onClick={() => onNavigate('signin')}
                icon={<ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />}
              >
                <span>Return to Sign in</span>
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
