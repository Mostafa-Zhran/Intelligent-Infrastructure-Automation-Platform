import React, { useState } from 'react';
import { UserPlus, User, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { PageId } from '../types';
import { authApi } from '../services/api';

interface SignUpPageProps {
  onNavigate: (page: PageId) => void;
  onSignUpSuccess: (userData: { id?: string; name: string; email: string; role?: string }) => void;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onNavigate,
  onSignUpSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Work Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please provide a valid work email address.';
    }

    // Password requirements: 8+ characters with upper case, lower case and a number
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (!hasLength || !hasUpper || !hasLower || !hasNumber) {
      newErrors.password = 'Must be 8+ characters with uppercase, lowercase, and a number.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsLoading(true);

    try {
      const result = await authApi.signUp({
        name: fullName,
        email,
        password,
        confirmPassword,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSignUpSuccess({
          id: result.user?.id,
          name: result.user?.name || fullName,
          email: result.user?.email || email,
          role: result.user?.platform_role,
        });
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || 'Registration failed. Please check your data and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12">
      <GlassCard glow="cyan" size="lg" className="p-6 sm:p-8">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-violet-900/40 mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-[#0E0E18] rounded-[15px] flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Create account
          </h2>
          <p className="text-sm text-[#A1A1B5] mt-1">
            Start deploying in minutes.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Workspace Provisioned!</h3>
              <p className="text-xs text-[#A1A1B5] mt-1">
                Your credentials have been securely initialized. Redirecting to your account profile…
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
            <InputField
              label="Full Name"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev: FormErrors) => ({ ...prev, fullName: undefined }));
              }}
              error={errors.fullName}
              icon={<User className="w-4 h-4" />}
              required
              autoComplete="name"
            />

            <InputField
              label="Work Email"
              type="email"
              placeholder="alex@organization.io"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev: FormErrors) => ({ ...prev, email: undefined }));
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
                  if (errors.password) setErrors((prev: FormErrors) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                helperText="8+ characters with upper case, lower case and a number."
                required
                autoComplete="new-password"
              />

              {password && <PasswordStrengthMeter password={password} />}
            </div>

            <PasswordInput
              label="Confirm Password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev: FormErrors) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                loadingText="Setting up workspace…"
              >
                Create account
              </Button>
            </div>
          </form>
        )}

        {/* Bottom link: Already registered? Sign in */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-xs text-[#A1A1B5]">
            Already registered?{' '}
            <button
              onClick={() => onNavigate('signin')}
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 focus:outline-none focus:underline"
            >
              <span>Sign in</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      </GlassCard>
    </div>
  );
};
