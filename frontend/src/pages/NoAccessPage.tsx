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
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-16 animate-slideUpFade">
      <GlassCard glow="none" size="lg" className="p-5 sm:p-8 text-center" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
        {/* Shield / lock icon */}
        <div
          className="mx-auto w-14 h-14 rounded-2xl shadow-xl mb-5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(153,27,27,0.9) 0%, rgba(127,29,29,0.85) 100%)', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 8px 24px -6px rgba(239,68,68,0.35)' }}
        >
          <ShieldAlert className="w-7 h-7 text-red-300" />
        </div>

        {/* Heading & Text */}
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Access Restricted
          </h1>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-red-300 tabular-nums">
            <Lock className="w-3 h-3 text-red-400" />
            <span>HTTP 403 · FORBIDDEN</span>
          </div>

          <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed pt-1">
            You don’t have permission to view this page. Ask an administrator if your account requires elevated privileges.
          </p>
        </div>

        {/* User context strip */}
        <div className="py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 mb-5 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
          <span className="text-gray-300 truncate max-w-[200px] sm:max-w-none">{user.email}</span>
          <span className="text-white/30" aria-hidden="true">·</span>
          <span className="text-amber-400 font-semibold uppercase">
            Role: {user.role}
          </span>
        </div>

        {/* Policy Context Details */}
        <div className="p-3.5 bg-red-950/30 border border-red-500/25 rounded-xl text-left text-xs space-y-1.5 text-red-200 mb-6">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>RBAC Policy Enforcement</span>
          </div>
          <p className="text-[12px] text-gray-300 leading-normal pl-5.5">
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
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs text-gray-300 hover:text-white py-1 px-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Return to Account Profile →
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
