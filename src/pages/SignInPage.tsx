import React, { useState } from 'react';
import { Mail, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { PipelineVisual } from '../components/pipeline/PipelineVisual';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const result = await authApi.signIn({ email, password });
      onSignInSuccess(result.user);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password. Please verify and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Split screen desktop layout, mobile prioritizes sign-in form on top */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Right-side sign-in card (order-1 on mobile so login is immediately accessible, order-2 on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-5 w-full flex justify-center">
          <GlassCard glow="violet" size="lg" className="w-full max-w-md p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sign in
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                Welcome back. Enter your workspace credentials.
              </p>
            </div>

            {/* Error State Banner */}
            {authError && (
              <div 
                className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-start gap-2.5 animate-fadeIn"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-semibold block text-red-200">Authentication failed</strong>
                  <span className="text-red-300 leading-tight block mt-0.5">{authError}</span>
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
                    className="text-xs text-violet-300 hover:text-violet-200 py-1 px-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
              <p className="text-xs text-gray-300">
                No platform account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 py-1 px-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>Sign up</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>

            {/* Security label: Protected by Enterprise MFA IAM Policies */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by Enterprise MFA IAM Policies</span>
            </div>
          </GlassCard>
        </div>

        {/* Left-side brand panel (order-2 on mobile, order-1 on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-7 h-full flex items-center">
          <PipelineVisual />
        </div>
      </div>
    </div>
  );
};
