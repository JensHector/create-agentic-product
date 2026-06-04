import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api to the backend so the browser never touches the Anthropic key.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
