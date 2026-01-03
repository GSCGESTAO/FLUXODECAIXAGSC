
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para implantação estática (Netlify/Vercel)
export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis de ambiente sem filtro de prefixo para máxima compatibilidade
  // Fix: Cast process to any to resolve TS error for cwd() in the config execution context
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioridade de busca da chave:
  // 1. VITE_GOOGLE_API_KEY (Recomendado para Vite)
  // 2. VITE_API_KEY (Padrão do projeto)
  // 3. GOOGLE_API_KEY (Padrão Google)
  // 4. API_KEY (Fallback)
  const apiKey = env.VITE_GOOGLE_API_KEY || env.VITE_API_KEY || env.GOOGLE_API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          // Otimizações para Terser v5.31.0+
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
      // Mapeia o placeholder exigido pelo SDK para a chave encontrada
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});
