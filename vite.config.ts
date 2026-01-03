
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para implantação estática (ex: GitHub Pages)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  }
});
