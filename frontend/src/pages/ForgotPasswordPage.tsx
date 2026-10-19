import React, { useState } from 'react';
import { KeyRound, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
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
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12 animate-slideUpFade">
      <GlassCard glow="violet" size="lg" className="p-5 sm:p-8">
        {!isSubmitted ? (
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
                style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(67,56,202,0.85) 100%)', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 8px 24px -6px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Forgot password?
              </h2>
              <p className="text-sm text-[#C4C4D4] mt-1.5 max-w-xs mx-auto">
                Enter your registered email and we will send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <InputField
                label="Corporate Email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(undefined);
                }}
                error={error}
                icon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  loadingText="Dispatching reset link…"
                >
                  Send reset link
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-center">
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
            </div>
          </>
        ) : (
          /* Success state: symmetric with ResetPasswordPage */
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/60">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                Reset link dispatched
              </h3>
              <p className="text-xs text-[#A1A1B5] max-w-xs mx-auto leading-relaxed pt-1">
                If an account exists for this email, reset instructions have been sent to your inbox.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left text-xs space-y-1">
              <span className="text-[10px] font-mono text-[#A1A1B5] uppercase">Target Recipient:</span>
              <p className="font-mono text-cyan-300 truncate">{email || 'user@organization.io'}</p>
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

              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setError(undefined);
                }}
                className="text-xs text-[#A1A1B5] hover:text-cyan-300 transition-colors block mx-auto pt-1 focus:outline-none focus:underline"
              >
                Didn't receive the email? Try another address
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
