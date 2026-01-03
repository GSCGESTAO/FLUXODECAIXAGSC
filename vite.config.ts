
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para implantação estática e integração com VITE_API_KEY
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (incluindo VITE_API_KEY)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          // Configurações otimizadas para Terser v5.31.0+
          drop_console: false,
          drop_debugger: true,
          pure_funcs: []
        },
        format: {
          comments: false
        }
      }
    },
    define: {
      // Mapeia o placeholder exigido pelo SDK para a variável VITE configurada
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY)
    }
  };
});
