import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { PageId } from '../types';
import { authApi } from '../services/api';
import { calculatePasswordStrength } from '../components/ui/PasswordStrengthMeter';

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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const strength = calculatePasswordStrength(newPassword);

  const getStrengthBarColor = (index: number) => {
    if (index >= strength.score) return 'bg-neutral-800';
    if (strength.label === 'Strong') return 'bg-violet-400';
    if (strength.label === 'Fair') return 'bg-indigo-400';
    return 'bg-amber-400';
  };

  const getStrengthTextColor = () => {
    if (strength.label === 'Strong') return 'text-violet-300';
    if (strength.label === 'Fair') return 'text-indigo-300';
    if (strength.label === 'Weak') return 'text-amber-300';
    return 'text-gray-400';
  };

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
      // Clear token query parameter from URL
      window.history.replaceState({}, document.title, '/reset-password');
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Password reset failed. The reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col justify-between items-center relative overflow-hidden py-10 sm:py-16">
      {/* Dynamic Background Glows matching the design theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="w-96 h-96 -left-32 -top-32 absolute bg-violet-800/30 rounded-full blur-[128px]" />
        <div className="w-96 h-96 -right-20 top-1/3 absolute bg-indigo-500/25 rounded-full blur-[140px]" />
        <div className="w-[480px] h-[480px] left-1/2 -translate-x-1/2 bottom-0 absolute bg-sky-600/15 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-[480px] px-4 flex flex-col justify-center items-center my-auto">
        <div className="w-full relative flex flex-col justify-start items-start">
          {/* Ambient card aura glow */}
          <div className="absolute -inset-1 opacity-70 bg-gradient-to-r from-violet-800/30 via-indigo-400/20 to-sky-600/20 rounded-[32px] blur-xl -z-10" />

          {/* Glass Card Container */}
          <div className="w-full p-6 sm:p-8 bg-zinc-900/80 border border-white/10 rounded-3xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7),inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] backdrop-blur-2xl flex flex-col justify-start items-start gap-6">
            
            {/* Top Quick Back Action */}
            <div className="w-full flex items-center justify-between">
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

            {!isSuccess ? (
              <>
                {/* Header Section */}
                <div className="w-full flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-14 h-14 absolute inset-0 opacity-40 bg-gradient-to-br from-violet-600 to-indigo-400 rounded-2xl blur-md" />
                    <div className="w-14 h-14 relative bg-neutral-800/90 border border-white/10 rounded-2xl shadow-[inset_0px_2px_4px_0px_rgba(255,255,255,0.15)] flex justify-center items-center">
                      <Lock className="w-6 h-6 text-violet-300" />
                    </div>
                  </div>
                  <h1 className="text-zinc-100 text-2xl font-bold tracking-tight">
                    Set new password
                  </h1>
                  <p className="text-gray-400 text-sm font-normal mt-1.5">
                    Choose a strong password you have not used before.
                  </p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-5">
                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col gap-2 text-rose-300 text-xs animate-fadeIn">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                      {(submitError.toLowerCase().includes('expired') || submitError.toLowerCase().includes('invalid')) && (
                        <div className="pl-7 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigate('reset-link-expired')}
                            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 underline font-medium"
                          >
                            <span>Link expired? View recovery options →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!new URLSearchParams(window.location.search).get('token') && (
                    <div className="w-full flex flex-col gap-1.5">
                      <label htmlFor="reset-token-input" className="text-gray-300 text-xs font-medium tracking-tight">
                        Reset Security Token
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="reset-token-input"
                          type="text"
                          placeholder="Paste reset token from email"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="w-full h-12 pl-10 pr-4 bg-zinc-950/80 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                        <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* New Password Input */}
                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="new-password" className="text-gray-300 text-xs font-medium tracking-tight">
                      New password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
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
                        placeholder="••••••••••••"
                        className="w-full h-12 pl-10 pr-11 bg-zinc-950/80 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all font-sans"
                        autoComplete="new-password"
                      />
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="w-8 h-8 absolute right-2 text-zinc-400 hover:text-white flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.newPassword && (
                      <p className="text-xs text-rose-400 mt-0.5">{errors.newPassword}</p>
                    )}

                    {/* Password Strength Indicator */}
                    <div className="w-full pt-1.5 flex flex-col gap-1.5">
                      <div className="w-full h-1.5 flex items-center gap-1.5">
                        <div className={`flex-1 h-full rounded-full transition-colors ${getStrengthBarColor(0)}`} />
                        <div className={`flex-1 h-full rounded-full transition-colors ${getStrengthBarColor(1)}`} />
                        <div className={`flex-1 h-full rounded-full transition-colors ${getStrengthBarColor(2)}`} />
                        <div className={`flex-1 h-full rounded-full transition-colors ${getStrengthBarColor(3)}`} />
                      </div>
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-semibold tracking-wide">
                          Password strength:
                        </span>
                        <span className={`font-medium tracking-wide ${getStrengthTextColor()}`}>
                          {strength.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="confirm-password" className="text-gray-300 text-xs font-medium tracking-tight">
                      Confirm new password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        placeholder="••••••••••••"
                        className="w-full h-12 pl-10 pr-11 bg-zinc-950/80 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all font-sans"
                        autoComplete="new-password"
                      />
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="w-8 h-8 absolute right-2 text-zinc-400 hover:text-white flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="text-xs text-rose-400 mt-0.5">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 mt-2 relative bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 hover:from-violet-600 hover:via-indigo-500 hover:to-violet-600 active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(109,40,217,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                  >
                    <span>{isLoading ? 'Updating password…' : 'Update password'}</span>
                    <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </button>
                </form>

                {/* Footer Links inside Card */}
                <div className="w-full pt-2 flex justify-center items-center gap-1.5 text-xs text-center">
                  <span className="text-gray-400 font-normal">Link invalid or expired?</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-violet-300 hover:text-violet-200 underline font-medium transition-colors cursor-pointer"
                  >
                    Request a new one
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="w-full text-center py-4 flex flex-col items-center gap-5 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/60">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Password Updated</h2>
                  <p className="text-xs text-[#A1A1B5] max-w-xs mx-auto leading-relaxed pt-1">
                    Your credentials have been safely renewed across all platform services.
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left text-xs text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>All active legacy sessions terminated immediately.</span>
                </div>

                <div className="w-full pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('signin')}
                    className="w-full h-11 bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 hover:from-violet-600 hover:via-indigo-500 hover:to-violet-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span>Return to Sign in</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
