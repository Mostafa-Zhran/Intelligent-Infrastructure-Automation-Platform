import React from 'react';
import { Terminal, LogOut, User, LogIn, Zap } from 'lucide-react';
import { PageId, UserProfile } from '../../types';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isAuthenticated: boolean;
  user: UserProfile | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  isAuthenticated,
  user,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Backdrop blur surface */}
      <div className="absolute inset-0 bg-[#07070D]/80 backdrop-blur-xl" />
      {/* Bottom border with gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between">

        {/* Brand mark */}
        <button
          type="button"
          onClick={() => onNavigate(isAuthenticated ? 'profile' : 'signin')}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-xl p-1 -m-1"
          aria-label="Automated DevOps home"
        >
          {/* Icon container with violet gradient */}
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center shadow-md overflow-hidden flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(79,70,229,0.85) 100%)', border: '1px solid rgba(139,92,246,0.4)' }}>
            <Terminal className="w-4 h-4 text-white group-hover:text-cyan-200 transition-colors relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-bold text-white tracking-tight text-[15px] group-hover:text-violet-200 transition-colors">
              Automated DevOps
            </span>
            <span className="text-[10px] text-[#A1A1B5] font-mono tracking-wide mt-0.5 hidden sm:block">
              Cloud Infrastructure Automation
            </span>
          </div>
        </button>

        {/* Center: System status pill with pulsing dot */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-xs shadow-sm">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-medium text-emerald-300 tracking-wide">All systems operational</span>
            <span className="text-emerald-400/70 text-[10px] font-mono tabular-nums font-semibold">99.99%</span>
          </div>
        </div>

        {/* Right: Auth actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  currentPage === 'profile'
                    ? 'text-white bg-violet-500/15 border border-violet-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <User className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span className="hidden sm:block max-w-[120px] truncate">{user.fullName}</span>
                <span className="sm:hidden">Profile</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className={`text-xs px-3.5 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  currentPage === 'signin'
                    ? 'text-white bg-white/10 border border-white/15'
                    : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Sign in</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="text-xs px-3.5 py-2 rounded-xl text-white font-semibold shadow-md flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  boxShadow: '0 4px 16px -4px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Get started</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
