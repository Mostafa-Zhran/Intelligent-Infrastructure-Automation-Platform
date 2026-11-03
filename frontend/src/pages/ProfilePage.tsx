import React, { useState, useRef } from 'react';
import {
  User,
  Shield,
  Key,
  Lock,
  Mail,
  Camera,
  Trash2,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
} from 'lucide-react';
import { UserProfile, PageId } from '../types';
import { authApi } from '../services/api';

interface ProfilePageProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onNavigate: (page: PageId) => void;
  onSignOut: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onShowToast,
  onNavigate: _onNavigate,
  onSignOut,
}) => {
  // ── Profile details state ──────────────────────────────────
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Password state ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Password policy checks
  const hasMinLength = newPassword.length >= 8;
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);

  // ── Handle avatar upload ───────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      onShowToast('error', 'File Too Large', 'Please select an image smaller than 2.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      onUpdateUser({ avatarUrl: result });
      onShowToast('success', 'Avatar Updated', 'Profile photo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    onUpdateUser({ avatarUrl: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onShowToast('info', 'Avatar Reset', 'Profile photo reset to standard initials avatar.');
  };

  // ── Handle profile form submit ─────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'A valid email address is required.';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }
    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      const result = await authApi.updateProfile({ name: fullName, email });
      const updatedUser = result.user;
      const initials = (updatedUser?.name || fullName)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AM';

      onUpdateUser({
        fullName: updatedUser?.name || fullName,
        email: updatedUser?.email || email,
        avatarInitials: initials,
        status: updatedUser?.status,
        role: updatedUser?.platform_role,
      });
      onShowToast('success', 'Profile Updated', 'Your profile credentials were saved successfully.');
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message || 'Unable to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Handle password change submit ──────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!currentPassword) errs.currentPassword = 'Current password is required.';
    if (!newPassword || newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'New passwords do not match.';

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }
    setPasswordErrors({});
    setIsUpdatingPassword(true);
    setPasswordSuccess(false);

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      onShowToast('success', 'Security Updated', 'Your password has been changed successfully.');
    } catch (err: any) {
      onShowToast('error', 'Password Change Failed', err.message || 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="w-full relative py-8 sm:py-12 px-4 max-w-[740px] mx-auto space-y-6 animate-slideUpFade">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[340px] bg-violet-600/15 blur-[120px] rounded-full" />
        <div className="absolute top-[480px] -right-32 w-[380px] h-[380px] bg-sky-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Page Header */}
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)] animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1B5]">
            Account Security &amp; Identity
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Account Profile
        </h1>
        <p className="text-sm text-[#A1A1B5]">
          Manage your account credentials and personal preferences.
        </p>
      </header>

      {/* Card 1: Edit profile */}
      <section className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-[#13131F]/80 border border-white/10 backdrop-blur-md shadow-xl relative overflow-hidden transition duration-200">
        {/* Precision top specular rim highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
              <User className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit profile</h2>
              <p className="text-xs text-[#A1A1B5]">Update your photo and personal identity details</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-xs text-sky-300">
            ID: {user.id || 'dev-8842'}
          </span>
        </div>

        {/* Avatar preview & change block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-white/[0.02] border border-white/5 my-6">
          <div className="relative group cursor-pointer w-20 h-20 shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.35)] overflow-hidden border-2 border-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white tracking-wide">
                  {user.avatarInitials || 'AM'}
                </span>
              )}
            </div>

            <label
              htmlFor="avatar-upload-input"
              className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
              <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">Change</span>
            </label>
            <input
              ref={fileInputRef}
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                htmlFor="avatar-upload-input"
                className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition duration-150 border border-white/10"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload photo</span>
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#A1A1B5]">
              Recommended: Square PNG, JPG or WebP. Max size 2.5MB.
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="profile-fullname" className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full bg-[#0A0A12]/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-500"
              />
            </div>
            {profileErrors.fullName && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {profileErrors.fullName}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="profile-email-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Work Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="profile-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full bg-[#0A0A12]/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-500"
              />
            </div>
            {profileErrors.email && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {profileErrors.email}
              </p>
            )}
            <p className="text-xs text-emerald-400/90 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Email verified for automated deployments &amp; alerts</span>
            </p>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold tracking-wide hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-[0.99] transition duration-150 disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-white" />
              <span>{isSavingProfile ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Card 2: Change password */}
      <section className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-[#13131F]/80 border border-white/10 backdrop-blur-md shadow-xl relative overflow-hidden transition duration-200">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
            <Key className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Change password</h2>
            <p className="text-xs text-[#A1A1B5]">Ensure your account is using a long, random password.</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Password updated successfully. Next session will require new credentials.</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4">
          {/* Current password */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="current-pass-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Current Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="current-pass-input"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full bg-[#0A0A12]/90 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label="Toggle current password visibility"
                className="absolute right-3 text-gray-400 hover:text-white p-1 rounded-md transition duration-150"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.currentPassword}
              </p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="new-pass-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
              New Password
            </label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="new-pass-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong new password"
                required
                minLength={8}
                className="w-full bg-[#0A0A12]/90 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label="Toggle new password visibility"
                className="absolute right-3 text-gray-400 hover:text-white p-1 rounded-md transition duration-150"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm new password */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="confirm-pass-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1B5]">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <Shield className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="confirm-pass-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
                className="w-full bg-[#0A0A12]/90 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-3 text-gray-400 hover:text-white p-1 rounded-md transition duration-150"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Password policy indicator chips */}
          <div className="pt-1 flex flex-wrap gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] transition-colors ${
                hasMinLength
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.03] border-white/10 text-[#A1A1B5]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              8+ chars
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] transition-colors ${
                hasSymbol
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.03] border-white/10 text-[#A1A1B5]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasSymbol ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              1 symbol
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] transition-colors ${
                hasNumber
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.03] border-white/10 text-[#A1A1B5]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              1 number
            </span>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold tracking-wide hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-[0.99] transition duration-150 disabled:opacity-50"
            >
              <Shield className="w-4 h-4 text-white" />
              <span>{isUpdatingPassword ? 'Updating...' : 'Update password'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Card 3: Active Session */}
      <section className="rounded-2xl p-5 bg-[#171724]/70 border border-white/10 backdrop-blur-md shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1B5] shrink-0">
            <Laptop className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Active Session</h3>
            <p className="text-xs text-[#A1A1B5]">Sign out of your session on this device</p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] transition duration-150"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign out</span>
          </button>
        </div>
      </section>
    </div>
  );
};
export default ProfilePage;
