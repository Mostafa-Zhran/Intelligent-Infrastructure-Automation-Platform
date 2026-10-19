import React, { useState, useEffect, useRef } from 'react';
import { Terminal, LogOut, User, LogIn, Zap, Menu, X, Activity, Shield, ChevronRight } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close when clicking outside header
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  const handleSignOutClick = () => {
    setIsMobileMenuOpen(false);
    onSignOut();
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 w-full">
      {/* Backdrop blur surface */}
      <div className="absolute inset-0 bg-[#07070D]/85 backdrop-blur-xl" />
      {/* Bottom border with gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-2">
        {/* Brand mark pointing to Home / Landing Page */}
        <button
          type="button"
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-xl p-1 -m-1 flex-shrink-0"
          aria-label="Automated DevOps home"
        >
          {/* Icon container with violet gradient */}
          <div
            className="relative w-8 h-8 rounded-xl flex items-center justify-center shadow-md overflow-hidden flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(79,70,229,0.85) 100%)',
              border: '1px solid rgba(139,92,246,0.4)',
            }}
          >
            <Terminal className="w-4 h-4 text-white group-hover:text-cyan-200 transition-colors relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-col leading-none min-w-0">
            <span className="font-bold text-white tracking-tight text-[14px] sm:text-[15px] group-hover:text-violet-200 transition-colors truncate max-w-[130px] xs:max-w-[170px] sm:max-w-none">
              Automated DevOps
            </span>
            <span className="text-[10px] text-[#A1A1B5] font-mono tracking-wide mt-0.5 hidden sm:block">
              Cloud Infrastructure Automation
            </span>
          </div>
        </button>

        {/* Center: System status pill with pulsing dot (Visible on desktop) */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/35 border border-emerald-500/25 text-xs shadow-sm">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-medium text-emerald-300 tracking-wide">All systems operational</span>
            <span className="text-emerald-400/80 text-[10px] font-mono tabular-nums font-semibold ml-1">99.99%</span>
          </div>
        </div>

        {/* Desktop Right: Auth actions */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  currentPage === 'profile'
                    ? 'text-white bg-violet-500/15 border border-violet-500/30 shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <User className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span className="max-w-[130px] truncate">{user.fullName}</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sign out</span>
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
                className="text-xs px-3.5 py-2 rounded-xl text-white font-semibold shadow-md flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-[0.97] transition-all duration-150 hover:brightness-110"
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

        {/* Mobile Right: Quick Action Badge + Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {/* Quick primary action button on mobile */}
          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                currentPage === 'profile'
                  ? 'text-white bg-violet-500/20 border border-violet-500/40'
                  : 'text-gray-300 bg-white/[0.04] border border-white/10 hover:text-white'
              }`}
              aria-label="View user profile"
            >
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                {user.avatarInitials}
              </div>
              <span className="max-w-[75px] truncate font-mono text-[11px]">{user.fullName.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavClick(currentPage === 'signin' ? 'signup' : 'signin')}
              className="text-xs px-2.5 py-1.5 rounded-lg text-white font-semibold shadow-sm flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                border: '1px solid rgba(139,92,246,0.35)',
              }}
            >
              {currentPage === 'signin' ? (
                <>
                  <Zap className="w-3 h-3 flex-shrink-0" />
                  <span>Register</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3 flex-shrink-0" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          )}

          {/* Accessible 44x44px touch-target mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-violet-300 transition-transform duration-200 rotate-90 animate-scaleIn" />
            ) : (
              <Menu className="w-5 h-5 text-gray-200 transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-[#07070D]/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl p-4 animate-slideDownFade">
          <div className="space-y-3 max-w-lg mx-auto">
            {/* System Status Pill on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="font-medium text-emerald-300">All systems operational</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/80">
                <Activity className="w-3 h-3" />
                <span className="font-semibold">99.99%</span>
              </div>
            </div>

            {/* Authenticated User Card & Actions */}
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
                      {user.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                        <span className="badge badge-violet text-[9px] uppercase px-1.5 py-0.5">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1B5] truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('profile')}
                    className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      currentPage === 'profile'
                        ? 'bg-violet-600/20 text-white border border-violet-500/40'
                        : 'bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-violet-400" />
                      <span>Account Profile</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOutClick}
                    className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 active:bg-red-500/25 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated Navigation Actions */
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleNavClick('landing')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    currentPage === 'landing'
                      ? 'bg-violet-600/20 text-white border border-violet-500/40'
                      : 'bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-violet-400" />
                    <span>Platform Overview</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('signin')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    currentPage === 'signin'
                      ? 'bg-white/15 text-white border border-white/25'
                      : 'bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LogIn className="w-4 h-4 text-cyan-400" />
                    <span>Sign in to console</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('signup')}
                  className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                    border: '1px solid rgba(139,92,246,0.5)',
                    boxShadow: '0 4px 16px -2px rgba(124,58,237,0.5)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4" />
                    <span>Create new account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </button>

                <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#A1A1B5]">
                  <button
                    type="button"
                    onClick={() => handleNavClick('forgot-password')}
                    className="hover:text-white transition-colors py-1.5"
                  >
                    Forgot password?
                  </button>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-gray-400">
                    <Shield className="w-3 h-3 text-violet-400" />
                    <span>256-bit SSL</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

