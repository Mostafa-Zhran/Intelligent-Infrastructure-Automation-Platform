import React, { useState } from 'react';
import { Mail, Shield, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { PipelineVisual } from '../components/pipeline/PipelineVisual';
import { PageId } from '../types';

interface SignInPageProps {
  onNavigate: (page: PageId) => void;
  onSignInSuccess: (email: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onNavigate,
  onSignInSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please provide a valid corporate email address.';
    }

    if (!password) {
      newErrors.password = 'Workspace password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validate()) return;

    setIsLoading(true);

    // Simulated session validation delay
    setTimeout(() => {
      setIsLoading(false);
      // If user typed 'fail@error.com' or clicked trigger error
      if (email.includes('error') || password === 'wrong') {
        setAuthError('Invalid email or security token. Please verify and retry.');
      } else {
        onSignInSuccess(email);
      }
    }, 1200);
  };

  const fillDemoCredentials = () => {
    setEmail('alex.morgan@enterprise.dev');
    setPassword('DevOpsPass123!');
    setErrors({});
    setAuthError(null);
  };

  const triggerAuthError = () => {
    setEmail('alex.morgan@enterprise.dev');
    setPassword('wrong');
    setErrors({});
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthError('Invalid email or security token. Please verify and retry.');
    }, 800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Split screen desktop layout, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left-side brand panel */}
        <div className="lg:col-span-7 h-full flex items-center">
          <PipelineVisual />
        </div>

        {/* Right-side sign-in card */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <GlassCard glow="violet" size="lg" className="w-full max-w-md p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sign in
              </h2>
              <p className="text-sm text-[#A1A1B5] mt-1">
                Welcome back. Enter your workspace credentials.
              </p>
            </div>

            {/* Quick Demo Pre-fills for Reviewers */}
            <div className="flex items-center gap-2 mb-5 p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-[#A1A1B5] text-[11px]">Quick fill:</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 underline"
              >
                Valid account
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={triggerAuthError}
                className="text-[11px] font-medium text-red-400 hover:text-red-300 underline"
              >
                Simulate error
              </button>
            </div>

            {/* Error State Banner */}
            {authError && (
              <div 
                className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200 flex items-start gap-2.5 animate-fadeIn"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-semibold block text-red-300">Authentication failed</strong>
                  <span className="text-red-300/90 leading-tight block mt-0.5">{authError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <InputField
                label="Work Email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <div className="space-y-1">
                <PasswordInput
                  label="Password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={errors.password}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  loadingText="Validating session…"
                >
                  Sign in
                </Button>
              </div>
            </form>

            {/* Bottom link: No platform account? Sign up */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-xs text-[#A1A1B5]">
                No platform account?{' '}
                <button
                  onClick={() => onNavigate('signup')}
                  className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 focus:outline-none focus:underline"
                >
                  <span>Sign up</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>

            {/* Security label: Protected by Enterprise MFA IAM Policies */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1B5]/70">
              <Shield className="w-3 h-3 text-emerald-400/80" />
              <span>Protected by Enterprise MFA IAM Policies</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
