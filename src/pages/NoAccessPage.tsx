import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
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
    <div className="w-full max-w-lg mx-auto px-4 py-16">
      <GlassCard glow="none" size="lg" className="p-6 sm:p-8 text-center border-red-500/30">
        {/* Shield / lock icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600/30 via-red-500/20 to-amber-500/20 border border-red-500/40 p-[1px] shadow-2xl shadow-red-950/70 mb-5 flex items-center justify-center">
          <div className="w-full h-full bg-[#0E0E18] rounded-[15px] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Heading & Text */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/50 border border-red-500/30 text-[11px] font-mono text-red-300">
            <Lock className="w-3 h-3 text-red-400" />
            <span>HTTP 403 · FORBIDDEN</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            No access
          </h1>

          <p className="text-sm text-[#A1A1B5] max-w-md mx-auto leading-relaxed">
            You don’t have permission to view this page. Ask an admin if you need a different role.
          </p>
        </div>

        {/* User context row: name@email.com · Role: viewer */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 mb-6 flex items-center justify-center gap-2 text-xs font-mono">
          <span className="text-gray-300 truncate max-w-[200px] sm:max-w-none">{user.email}</span>
          <span className="text-white/30">·</span>
          <span className="text-amber-400 font-semibold uppercase">
            Role: {user.role}
          </span>
        </div>

        {/* Audit Context Details */}
        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-left text-xs space-y-1.5 text-red-300 mb-6">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>RBAC Policy Enforcement</span>
          </div>
          <p className="text-[11px] text-[#A1A1B5] leading-normal pl-5.5">
            Resource requires elevated privilege <code className="text-red-300 bg-red-950/60 px-1 py-0.5 rounded font-mono">cluster:operator</code> or <code className="text-red-300 bg-red-950/60 px-1 py-0.5 rounded font-mono">cluster:admin</code>. Your account is bound to <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded font-mono">viewer</code>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => onNavigate('signin')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Back to sign in
          </Button>

          <Button
            variant="destructive"
            onClick={onSignOut}
            icon={<LogOut className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Sign out
          </Button>
        </div>

        {/* Return to profile shortcut */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <button
            onClick={() => onNavigate('profile')}
            className="text-xs text-[#A1A1B5] hover:text-white transition-colors"
          >
            Return to Account Profile →
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
