import React, { useState } from 'react';
import { KeyRound, Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { PageId } from '../types';
import { authApi } from '../services/api';

interface ForgotPasswordPageProps {
  onNavigate: (page: PageId) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigate,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your corporate email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid corporate email format.');
      return;
    }

    setError(undefined);
    setIsLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Unable to request password reset. Please retry.');
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
            onClick={() => onNavigate('signin')}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors group py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Sign In</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Credential Recovery</span>
          </span>
        </div>

        {/* Card Container */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#090A14] border border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden p-6 sm:p-8 backdrop-blur-xl">
          {/* Top specular hairline */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-2xl mb-4 bg-gradient-to-br from-violet-600/30 to-purple-800/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Reset password
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Enter your registered work email to receive a cryptographically signed recovery link.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 font-mono animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                    Corporate Email <span className="text-rose-400">*</span>
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
                        if (error) setError(undefined);
                      }}
                      placeholder="name@company.com"
                      className={`w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/[0.03] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                        error
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                          : 'border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-violet-500/30'
                      }`}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2 font-mono text-xs">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending recovery token...</span>
                      </span>
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Recovery email dispatched</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                  We sent a single-use verification link to <span className="font-mono text-cyan-300 font-semibold">{email}</span>. Please verify your inbox.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="w-full h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-mono font-medium transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tokens expire in 15 minutes · Single-use audit trail</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
