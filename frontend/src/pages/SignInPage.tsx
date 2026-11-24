import React, { useState } from 'react';
import { Mail, AlertCircle, ArrowRight, ArrowLeft, LogIn, Lock, ShieldCheck } from 'lucide-react';
import { PageId } from '../types';
import { authApi } from '../services/api';

interface SignInPageProps {
  onNavigate: (page: PageId) => void;
  onSignInSuccess: (userData: { id?: string; name?: string; email: string; role?: string }) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onNavigate,
  onSignInSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Corporate work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please provide a valid corporate email address.';
    }

    if (!password) {
      newErrors.password = 'Workspace password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const result = await authApi.signIn({ email, password });
      onSignInSuccess(result.user);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8 sm:py-12 animate-fadeIn relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Navigation back */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors group py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>IIAP Auth Gateway</span>
          </span>
        </div>

        {/* Card Container */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#090A14] border border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden p-6 sm:p-8 backdrop-blur-xl">
          {/* Top specular hairline */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl mb-4 bg-gradient-to-br from-violet-600/30 to-purple-800/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sign in to console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed font-sans">
              Enter your corporate credentials to access the automation pipeline.
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 font-mono animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Work Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@company.com"
                  className={`w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/[0.03] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                    errors.email
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                      : 'border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-violet-500/30'
                  }`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400 font-mono">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono font-medium text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••••••"
                  className={`w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.03] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                    errors.password
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                      : 'border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-violet-500/30'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400 font-mono">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <span className="relative px-3 bg-[#090A14] text-[11px] font-mono text-slate-500 uppercase">
              New to IIAP?
            </span>
          </div>

          {/* Create Account link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="w-full h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>Create developer workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-bit TLS encrypted session · SOC2 Type II</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
