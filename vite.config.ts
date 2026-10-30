import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { works } from './vite/works';

export default defineConfig({
  plugins: [react(), works()],
  // Доступ из локальной сети: сайт можно открыть с телефона по IP компьютера
  server: { host: true },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
