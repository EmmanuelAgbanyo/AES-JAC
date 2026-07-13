
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1600,
      outDir: 'dist',
    },
    server: {
      proxy: {
        '/api/manus': {
          target: 'https://api.manus.im',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/manus/, '')
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY || ''),
      'process.env.MANUS_API_KEY': JSON.stringify(env.MANUS_API_KEY || ''),
      'process.env': {},
    },
  };
});
