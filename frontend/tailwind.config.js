/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          darkest: '#07070D',
          dark: '#131319',
          card: 'rgba(13, 13, 22, 0.84)',
          border: 'rgba(255, 255, 255, 0.09)',
          'border-focus': 'rgba(139, 92, 246, 0.5)',
        },
        brand: {
          violet: '#8B5CF6',
          indigo: '#6366F1',
          cyan: '#38BDF8',
          success: '#10B981',
          error: '#EF4444',
          muted: '#A1A1B5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'input': '12px',
        'glass': '20px',
        'glass-lg': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-violet': '0 0 30px -4px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 30px -4px rgba(56, 189, 248, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'elevation-1': '0 4px 16px -4px rgba(0,0,0,0.5)',
        'elevation-2': '0 16px 40px -8px rgba(0,0,0,0.65)',
        'elevation-3': '0 32px 64px -16px rgba(0,0,0,0.8)',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease both',
        'slide-up': 'slideUpFade 0.45s ease both',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUpFade: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
