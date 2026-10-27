import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// base './' hace que el build funcione en cualquier subruta (GitHub Pages, Netlify, una carpeta local…).
// Usamos HashRouter, así que no hace falta configurar reescrituras en el servidor.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
  },
});
