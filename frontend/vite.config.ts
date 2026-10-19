import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'Backend_', 'BACKEND_']);
  const backendTarget = (env.Backend_API || env.BACKEND_API || env.VITE_API_URL || 'http://localhost:3000').trim();

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'Backend_', 'BACKEND_'],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
          },
        },
      },
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
