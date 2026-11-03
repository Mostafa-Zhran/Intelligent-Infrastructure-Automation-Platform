import React from 'react';
import { ArrowRight, ArrowLeft, History } from 'lucide-react';
import { PageId } from '../types';

interface ResetLinkExpiredPageProps {
  onNavigate: (page: PageId) => void;
}

export const ResetLinkExpiredPage: React.FC<ResetLinkExpiredPageProps> = ({
  onNavigate,
}) => {
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-8rem)] items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-16 relative">
      <div className="relative w-full max-w-[460px] mx-auto flex flex-col items-center">
        {/* Ambient backplate glow effects */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-[90px] pointer-events-none -z-10" />
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-56 h-56 bg-sky-500/15 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Main Glassmorphic Verification Card */}
        <div className="relative w-full rounded-3xl p-8 sm:p-10 bg-[#13131F]/80 backdrop-blur-2xl border border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col items-center text-center transition-all duration-300">
          {/* Status Icon with Amber Telemetry Glow */}
          <div className="relative mb-6">
            <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur-md animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.3)]">
              <History className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            This link is invalid or expired
          </h1>

          {/* Description Text */}
          <p className="text-sm text-[#A1A1B5] max-w-sm mb-8 leading-relaxed">
            Reset links work once and expire after 30 minutes.
          </p>

          {/* Action CTAs */}
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 flex items-center justify-center text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_4px_28px_0_rgba(139,92,246,0.75)] hover:brightness-110 active:scale-[0.99] transition-all duration-200"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Request a new link</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('signin')}
              className="inline-flex items-center justify-center gap-2 py-2 text-sm text-[#A1A1B5] hover:text-white transition-colors duration-150 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Back to sign in</span>
            </button>
          </div>

          {/* Technical Telemetry Subtle Indicator */}
          <div className="mt-8 pt-6 w-full flex items-center justify-between text-xs text-[#A1A1B5] border-t border-white/5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Status: Token Expired</span>
            </span>
            <span className="font-mono text-[11px] text-[#A1A1B5]/80 bg-white/5 px-2 py-0.5 rounded">
              ERR_AUTH_EXP_01
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ResetLinkExpiredPage;
