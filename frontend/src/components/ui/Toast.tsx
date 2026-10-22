import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />,
    bg: 'rgba(6, 32, 18, 0.94)',
    border: 'rgba(16, 185, 129, 0.35)',
    barColor: '#10B981',
    titleColor: '#6EE7B7',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  error: {
    icon: <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />,
    bg: 'rgba(48, 8, 12, 0.94)',
    border: 'rgba(239, 68, 68, 0.38)',
    barColor: '#EF4444',
    titleColor: '#FCA5A5',
    glowColor: 'rgba(239, 68, 68, 0.15)',
  },
  info: {
    icon: <Info className="w-5 h-5 flex-shrink-0 text-cyan-400" />,
    bg: 'rgba(7, 28, 44, 0.94)',
    border: 'rgba(56, 189, 248, 0.35)',
    barColor: '#38BDF8',
    titleColor: '#7DD3FC',
    glowColor: 'rgba(56, 189, 248, 0.15)',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const config = toastConfig[toast.type];

  return (
    <div
      className="fixed z-50 bottom-4 inset-x-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full animate-slideUpFade"
      role="alert"
      aria-live="assertive"
      style={{
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-200"
        style={{
          background: config.bg,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid ${config.border}`,
          boxShadow: `0 20px 48px -12px rgba(0,0,0,0.85), 0 0 24px -4px ${config.glowColor}, inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
      >
        {/* Top colored accent indicator line */}
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${config.barColor}, transparent 85%)` }}
        />

        <div className="p-3.5 sm:p-4 flex items-start gap-3">
          {/* Status icon with subtle glow container */}
          <div className="mt-0.5 p-1 rounded-lg bg-white/[0.04] border border-white/5 flex-shrink-0">
            {config.icon}
          </div>

          {/* Text content with high contrast and readable line measure */}
          <div className="flex-1 min-w-0 pr-1">
            <h4
              className="text-[13px] font-semibold tracking-wide leading-tight"
              style={{ color: config.titleColor }}
            >
              {toast.title}
            </h4>
            <p className="text-[12px] text-[#D1D1E0] mt-1 leading-relaxed break-words">
              {toast.message}
            </p>
          </div>

          {/* Accessible 44x44px touch target close button for mobile & desktop */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex-shrink-0 -mr-1 -mt-0.5"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle auto-dismiss countdown bar at bottom */}
        <div className="h-[2px] w-full bg-white/5 overflow-hidden">
          <div
            className="h-full origin-left"
            style={{
              background: config.barColor,
              animation: 'toast-countdown 4s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
};

