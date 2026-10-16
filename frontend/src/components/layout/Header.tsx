import React from 'react';
import { Terminal, LogOut, User, UserPlus, LogIn } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07070D]/85 backdrop-blur-md transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Code/Deployment icon and brand name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(isAuthenticated ? 'profile' : 'signin')}
            className="flex items-center gap-2.5 text-left group focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg p-1 -m-1"
            aria-label="Automated DevOps home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-violet-900/30 group-hover:shadow-violet-600/40 transition-shadow">
              <div className="w-full h-full bg-[#0E0E18] rounded-[11px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight text-base sm:text-lg">
                  Automated DevOps
                </span>
              </div>
              <span className="text-[11px] text-[#A1A1B5] -mt-0.5 hidden xs:block">
                Cloud Infrastructure Automation
              </span>
            </div>
          </button>
        </div>

        {/* Center (Desktop): Health pill with cyan pulsing dot and "All systems operational" */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/25 text-xs text-cyan-200 shadow-sm shadow-cyan-950/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span className="font-medium tracking-wide">All systems operational</span>
            <span className="text-cyan-400/60 text-[10px] font-mono">99.99%</span>
          </div>
        </div>

        {/* Right: Auth Actions / Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('profile')}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                  currentPage === 'profile'
                    ? 'text-white bg-violet-600/25 border border-violet-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:block">{user.fullName}</span>
                <span className="sm:hidden">Profile</span>
              </button>

              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated State: Clean Sign In & Sign Up buttons */
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('signin')}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                  currentPage === 'signin'
                    ? 'text-white bg-white/10 border border-white/15'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign in</span>
              </button>

              <button
                onClick={() => onNavigate('signup')}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-violet-950/50 border border-violet-400/20 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
