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
          card: 'rgba(15, 15, 25, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
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
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
