import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 shadow-emerald-950/50',
    error: 'border-red-500/30 bg-red-950/80 shadow-red-950/50',
    info: 'border-cyan-500/30 bg-cyan-950/80 shadow-cyan-950/50',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slideUp">
      <div className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${borders[toast.type]}`}>
        {icons[toast.type]}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-white tracking-wide">{toast.title}</h4>
          <p className="text-xs text-gray-300 mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
