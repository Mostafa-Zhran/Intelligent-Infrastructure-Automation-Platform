import React, { useState } from 'react';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
import { PageId } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your corporate email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid corporate email format.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12">
      <GlassCard glow="violet" size="lg" className="p-6 sm:p-8">
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-violet-900/40 mb-3 flex items-center justify-center">
                <div className="w-full h-full bg-[#0E0E18] rounded-[15px] flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-violet-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Forgot password?
              </h2>
              <p className="text-sm text-[#A1A1B5] mt-1.5 max-w-xs mx-auto">
                Enter your email and we will send you a reset link.
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
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="text-xs text-[#A1A1B5] hover:text-white transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>
            </div>
          </>
        ) : (
          /* Replaced form with specified success state */
          <div className="text-center py-4 space-y-4 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">
                If this email exists, a reset link has been sent.
              </h3>
              <p className="text-xs text-[#A1A1B5] max-w-xs mx-auto leading-relaxed pt-1">
                Check your inbox and spam folder for instructions.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left text-xs space-y-1">
              <span className="text-[10px] font-mono text-[#A1A1B5] uppercase">Target Recipient:</span>
              <p className="font-mono text-cyan-300 truncate">{email || 'user@organization.io'}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => onNavigate('reset-password')}
              >
                <span>Simulate Token Click (Set new password)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onNavigate('signin')}
              >
                Return to Sign in
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
