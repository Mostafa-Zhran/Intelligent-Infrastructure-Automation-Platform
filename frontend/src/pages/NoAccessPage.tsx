import React from 'react';
import { Lock, ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { UserProfile, PageId } from '../types';

interface NoAccessPageProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onSignOut: () => void;
}

export const NoAccessPage: React.FC<NoAccessPageProps> = ({
  user,
  onNavigate,
  onSignOut,
}) => {
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-8rem)] items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-16 relative animate-slideUpFade">
      {/* Ambient background glows */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden -z-10">
        <div className="w-96 h-96 rounded-full bg-violet-600/20 blur-[120px] -translate-y-8 animate-pulse" />
        <div className="w-80 h-80 rounded-full bg-indigo-500/15 blur-[100px] translate-x-20 translate-y-20" />
      </div>

      <div className="relative w-full max-w-lg bg-[#13131F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col items-center text-center">
        {/* Precision top specular rim highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Lock Icon with soft violet telemetry aura */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-2 bg-violet-500/25 rounded-2xl blur-lg" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#1B1B26] border border-white/10 flex items-center justify-center text-violet-300 shadow-inner">
            <Lock className="w-8 h-8 text-violet-300" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          No access
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-[#A1A1B5] max-w-sm mt-3 leading-relaxed">
          You don't have permission to view this page. Ask an admin if you need a different role.
        </p>

        {/* Context Strip */}
        <p className="w-full mt-6 text-xs font-mono text-[#A1A1B5] text-center bg-white/[0.03] py-2 px-3 rounded-lg border border-white/5">
          Signed in as <span className="text-white font-medium">{user.email}</span> · Role: <span className="text-violet-300 font-semibold uppercase">{user.role || 'viewer'}</span>
        </p>

        {/* RBAC Technical Policy Details Card */}
        <div className="w-full mt-4 p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-xl text-left text-xs space-y-1.5 text-rose-200">
          <div className="flex items-center gap-2 font-medium text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>RBAC Policy Enforcement</span>
          </div>
          <p className="text-[11px] text-[#A1A1B5] leading-relaxed pl-5">
            Resource requires elevated privilege <code className="text-rose-300 bg-rose-950/50 px-1 py-0.5 rounded font-mono">cluster:operator</code> or <code className="text-rose-300 bg-rose-950/50 px-1 py-0.5 rounded font-mono">cluster:admin</code>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] flex items-center justify-center gap-2"
          >
            <span>Back to dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-3 px-6 rounded-xl text-sm font-medium text-[#A1A1B5] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default NoAccessPage;
