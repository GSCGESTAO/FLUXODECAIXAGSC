
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para implantação estática (Netlify/Vercel)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: []
      },
      format: {
        comments: false
      }
    }
  }
});
