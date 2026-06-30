import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // 后端 (glidinghorse) HTTP/SSE 地址，默认本机 8080。
  const backend = env.VITE_BACKEND_URL || 'http://localhost:8080';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // 将后端接口透传到 glidinghorse，避免前端跨域。
      proxy: {
        '/api': {target: backend, changeOrigin: true},
        '/health': {target: backend, changeOrigin: true},
        '/metrics': {target: backend, changeOrigin: true},
      },
    },
  };
});
