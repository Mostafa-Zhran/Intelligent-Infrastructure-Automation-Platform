import React, { useState } from 'react';
import { Compass, ChevronUp, ChevronDown, Check, Lock } from 'lucide-react';
import { PageId } from '../../types';

interface QuickPageSwitcherProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isAuthenticated: boolean;
}

export const QuickPageSwitcher: React.FC<QuickPageSwitcherProps> = ({
  currentPage,
  onNavigate,
  isAuthenticated,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const pages: { id: PageId; label: string; tag: string; requiresAuth?: boolean }[] = [
    { id: 'signin', label: '1. Sign In', tag: 'Split Screen' },
    { id: 'signup', label: '2. Sign Up', tag: 'Validation' },
    { id: 'forgot-password', label: '3. Forgot Password', tag: 'Recovery' },
    { id: 'reset-password', label: '4. Reset Password', tag: 'Strength Meter' },
    { id: 'profile', label: '5. Account Profile', tag: isAuthenticated ? 'Active Shell' : 'Requires Account', requiresAuth: true },
    { id: 'no-access', label: '6. No Access (403)', tag: 'Status Card' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside aria-label="Quick Page Switcher" className="fixed bottom-4 left-4 z-50">
        <div className="glass-panel rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          {isOpen && (
            <div className="p-3 bg-[#0C0C16] border-b border-white/10 space-y-1 w-64 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1B5]">
                  Mock Route Switcher
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isAuthenticated ? 'text-emerald-400 bg-emerald-950/40' : 'text-[#A1A1B5] bg-white/5'
                }`}>
                  {isAuthenticated ? 'Authenticated' : 'No Account'}
                </span>
              </div>
              {pages.map((p) => {
                const active = currentPage === p.id;
                const isLocked = p.requiresAuth && !isAuthenticated;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      active 
                        ? 'bg-violet-600/30 text-white font-medium border border-violet-500/40' 
                        : isLocked
                        ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isLocked && <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      <span className="truncate">{p.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <span className={`text-[9px] font-mono px-1 rounded ${
                        isLocked ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30' : 'text-[#A1A1B5] bg-white/5'
                      }`}>
                        {p.tag}
                      </span>
                      {active && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-gray-200 hover:text-white bg-black/60 hover:bg-black/80 transition-colors w-full justify-between"
            title="Switch between the 6 auth/account pages"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[#A1A1B5]">Screen:</span>
              <span className="font-semibold text-cyan-300 capitalize">
                {currentPage.replace('-', ' ')}
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#A1A1B5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#A1A1B5]" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
