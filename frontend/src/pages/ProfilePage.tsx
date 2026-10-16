import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  Camera,
  Lock,
  BadgeCheck,
  AlertCircle,
  Mail,
  Fingerprint,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { InputField } from '../components/ui/InputField';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { UserProfile, PageId } from '../types';
import { authApi } from '../services/api';

interface ProfilePageProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onNavigate: (page: PageId) => void;
  onSignOut: () => void;
}

type Tab = 'profile' | 'security';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onShowToast,
  onNavigate: _onNavigate,
  onSignOut: _onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile state ──────────────────────────────────────
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    email?: string;
  }>({});

  // ── Security state ─────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { fullName?: string; email?: string } = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'A valid email address is required.';
    if (Object.keys(errs).length > 0) { setProfileErrors(errs); return; }
    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      const result = await authApi.updateProfile({ name: fullName, email });
      const updatedUser = result.user;
      const initials = (updatedUser?.name || fullName).split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'AM';

      onUpdateUser({
        fullName: updatedUser?.name || fullName,
        email: updatedUser?.email || email,
        avatarInitials: initials,
        status: updatedUser?.status,
        role: updatedUser?.platform_role,
      });
      onShowToast('success', 'Profile Updated', 'Your profile changes have been saved to the database.');
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message || 'Unable to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};
    if (!currentPassword) errs.currentPassword = 'Current password is required.';
    if (!newPassword || newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }
    setPasswordErrors({});
    setIsUpdatingPassword(true);
    setPasswordSuccess(false);

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('success', 'Password Updated', 'Your password has been changed successfully.');
    } catch (err: any) {
      onShowToast('error', 'Password Change Failed', err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile Details', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
                Account Management
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Account Profile</h1>
            <p className="text-sm text-[#A1A1B5] mt-1">
              Manage your identity and credentials.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[#A1A1B5]">ID:</span>
            <span className="text-white font-semibold">{user.id}</span>
          </div>
        </div>
      </div>

      {/* ── Identity Card ── */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-950/30 via-[#0D0D1A]/80 to-indigo-950/30 backdrop-blur-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-[2px] shadow-lg shadow-violet-900/40">
            <div className="w-full h-full bg-[#0A0A14] rounded-[14px] flex items-center justify-center text-xl font-bold text-white">
              {user.avatarInitials}
            </div>
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#07070D] flex items-center justify-center shadow-md">
            <BadgeCheck className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h2 className="text-lg font-bold text-white truncate">{user.fullName}</h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider flex-shrink-0">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-[#A1A1B5] truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-[#A1A1B5]">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Role: <strong className="text-white font-mono">{user.role}</strong>
            </span>
            {user.status && (
              <span className="flex items-center gap-1.5 text-xs text-[#A1A1B5]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Status: <strong className="text-emerald-400 font-mono">{user.status}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Session Active
          </div>
          <button
            onClick={() => onShowToast('info', 'Photo Upload', 'Photo upload dialog triggered')}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#A1A1B5] hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Change photo
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="mb-6 flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-600/40 to-indigo-600/30 text-white border border-violet-500/40 shadow-md'
                : 'text-[#A1A1B5] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-violet-400' : 'text-gray-500'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <GlassCard glow="violet" size="lg" className="p-6 sm:p-8 animate-fadeIn">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
            <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30">
              <User className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Profile Details</h3>
              <p className="text-xs text-[#A1A1B5] mt-0.5">Update your display name, email, and workspace info.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} noValidate className="space-y-5">
            {/* Row 1 — Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={profileErrors.fullName}
                placeholder="Alex Morgan"
                required
              />

              {/* Email with verified badge */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Work Email
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1B5] pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`glass-input w-full text-white placeholder-[#A1A1B5]/50 text-sm rounded-input py-2.5 pl-10 pr-3.5 ${
                      profileErrors.email ? '!border-red-500/70' : ''
                    }`}
                  />
                </div>
                {profileErrors.email && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {profileErrors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2 — User ID, Platform Role & Account Status (read-only from database) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">User ID</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-input bg-black/40 border border-white/10 cursor-not-allowed opacity-70">
                  <Fingerprint className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-white/80 truncate">{user.id}</span>
                </div>
                <p className="text-[11px] text-[#A1A1B5]/70">Database UUID</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">Platform Role</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-input bg-black/40 border border-white/10 cursor-not-allowed opacity-70">
                  <Shield className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-white/80">{user.role?.toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-[#A1A1B5]/70">Role defined in DB</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">Account Status</label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-input bg-black/40 border border-white/10 cursor-not-allowed opacity-70">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{user.status || 'ACTIVE'}</span>
                </div>
                <p className="text-[11px] text-[#A1A1B5]/70">Current account state</p>
              </div>
            </div>

            {/* Save footer */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <p className="text-[11px] text-[#A1A1B5]">Changes apply immediately to your workspace identity.</p>
              <Button type="submit" isLoading={isSavingProfile} loadingText="Saving…">
                Save changes
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === 'security' && (
        <GlassCard glow="cyan" size="lg" className="p-6 sm:p-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
            <div className="p-2 rounded-xl bg-cyan-950/50 border border-cyan-500/25">
              <Key className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Change Password</h3>
              <p className="text-xs text-[#A1A1B5] mt-0.5">Use a strong, unique password for your account.</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-300">Password updated successfully</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">All active API sessions have been refreshed.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordErrors.currentPassword}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PasswordInput
                label="New Password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={passwordErrors.newPassword}
                helperText="At least 8 characters"
                required
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordErrors.confirmPassword}
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <p className="text-[11px] text-[#A1A1B5]">You'll be asked to sign in again after updating.</p>
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingPassword}
                loadingText="Updating…"
              >
                Update password
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

    </div>
  );
};
