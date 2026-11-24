import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { PageId } from '../types';
import { authApi } from '../services/api';

interface ResetPasswordPageProps {
  onNavigate: (page: PageId) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigate,
}) => {
  const [token] = useState(() => {
    return new URLSearchParams(window.location.search).get('token') || '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      window.history.replaceState({}, document.title, '/reset-password');
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Password reset failed. The reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8 sm:py-12 animate-fadeIn relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-600/10 blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Navigation back */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('signin')}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors group py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Sign In</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Key Rotation Service</span>
          </span>
        </div>

        {/* Card Container */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#090A14] border border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden p-6 sm:p-8 backdrop-blur-xl">
          {/* Top specular hairline */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-2xl mb-4 bg-gradient-to-br from-cyan-600/30 to-blue-800/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Create new password
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Set a new hardened password for your operator account.
                </p>
              </div>

              {/* Error Banner */}
              {submitError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 font-mono animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                    New Workspace Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      placeholder="Minimum 8 characters"
                      className={`w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.03] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                        errors.newPassword
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                          : 'border-white/10 hover:border-white/20 focus:border-cyan-500 focus:ring-cyan-500/30'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-mono text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1.5 text-xs text-rose-400 font-mono">{errors.newPassword}</p>
                  )}

                  {newPassword && (
                    <div className="mt-2.5">
                      <PasswordStrengthMeter password={newPassword} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                    Confirm New Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Repeat your new password"
                      className={`w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.03] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                        errors.confirmPassword
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                          : 'border-white/10 hover:border-white/20 focus:border-cyan-500 focus:ring-cyan-500/30'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-mono text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-rose-400 font-mono">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:shadow-[0_0_32px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2 font-mono text-xs">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating credentials...</span>
                      </span>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success View */
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Password rotated successfully</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                  Your credentials have been securely updated. You can now authenticate with your new password.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-[0_0_24px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-4 h-4 text-violet-200" />
                </button>
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cryptographic key derivation · Automated session invalidation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
