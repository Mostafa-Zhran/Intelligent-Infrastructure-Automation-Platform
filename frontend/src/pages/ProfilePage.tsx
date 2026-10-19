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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slideUpFade">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1B5] mb-1">Account Management</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">Account Profile</h1>
            <p className="text-sm text-[#C4C4D4] mt-1">
              Manage your identity and credentials.
            </p>
          </div>

          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[#A1A1B5]">ID:</span>
            <span className="text-white font-semibold tabular-nums">{user.id}</span>
          </div>
        </div>
      </div>

      {/* ── Identity Card ── */}
      <div
        className="mb-6 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{ background: 'rgba(13,13,22,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 16px 40px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)' }}
      >
        {/* Avatar with gradient ring */}
        <div className="relative flex-shrink-0">
          <div
            className="p-[2px] rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(34,211,238,0.7) 100%)' }}
          >
            <div
              className="w-16 h-16 rounded-[14px] flex items-center justify-center text-xl font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.8) 0%, rgba(67,56,202,0.7) 100%)' }}
            >
              {user.avatarInitials}
            </div>
          </div>
          <div
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-[#07070D] flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <BadgeCheck className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h2 className="text-lg font-extrabold text-white tracking-tight truncate">{user.fullName}</h2>
            <span className="badge badge-violet uppercase">{user.role}</span>
          </div>
          <p className="text-[13px] text-[#A1A1B5] truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-[#A1A1B5]">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Role: <strong className="text-white font-mono text-xs">{user.role}</strong>
            </span>
            {user.status && (
              <span className="flex items-center gap-1.5 text-xs text-[#A1A1B5]">
                <span className="status-dot-pulse w-2 h-2 bg-emerald-400 inline-block" />
                Status: <strong className="text-emerald-400 font-mono text-xs">{user.status}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <span className="status-dot-pulse w-1.5 h-1.5 bg-emerald-400 inline-block" />
            Session Active
          </div>
          <button
            type="button"
            onClick={() => onShowToast('info', 'Photo Upload', 'Photo upload feature coming soon')}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#C4C4D4] hover:text-white px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <Camera className="w-3.5 h-3.5" />
            Change photo
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div role="tablist" aria-label="Profile Sections" className="mb-6 flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              activeTab === tab.id
                ? 'bg-violet-900/50 text-white border border-violet-500/40 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-violet-300' : 'text-gray-400'}>
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
                  <label htmlFor="profile-email" className="text-xs font-semibold uppercase tracking-wider text-gray-200">
                    Work Email
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!profileErrors.email}
                    className={`glass-input w-full text-white placeholder-gray-400 text-sm rounded-xl py-2.5 pl-10 pr-3.5 ${
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
              <p className="text-[11px] text-gray-400">Changes apply immediately to your workspace identity.</p>
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
              <p className="text-xs text-gray-300 mt-0.5">Use a strong, unique password for your account.</p>
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
              <p className="text-[11px] text-gray-400">You'll be asked to sign in again after updating.</p>
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
