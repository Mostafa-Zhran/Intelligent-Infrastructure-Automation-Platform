import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#34D399' }} />,
    bg: 'rgba(5,46,22,0.92)',
    border: 'rgba(16,185,129,0.3)',
    barColor: '#10B981',
    titleColor: '#6EE7B7',
  },
  error: {
    icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#F87171' }} />,
    bg: 'rgba(69,10,10,0.92)',
    border: 'rgba(239,68,68,0.35)',
    barColor: '#EF4444',
    titleColor: '#FCA5A5',
  },
  info: {
    icon: <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#38BDF8' }} />,
    bg: 'rgba(7,36,55,0.92)',
    border: 'rgba(56,189,248,0.3)',
    barColor: '#38BDF8',
    titleColor: '#7DD3FC',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const config = toastConfig[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slideUpFade" role="alert" aria-live="polite">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: config.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${config.border}`,
          boxShadow: `0 20px 48px -12px rgba(0,0,0,0.8), 0 0 0 1px ${config.border}, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Colored top bar */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${config.barColor}, transparent)` }} />

        <div className="p-4 flex items-start gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-semibold tracking-wide" style={{ color: config.titleColor }}>
              {toast.title}
            </h4>
            <p className="text-[12px] text-[#C4C4D4] mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
