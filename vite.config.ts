
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // '0.0.0.0' permite que o servidor seja acessado por outros IPs na rede
    host: '0.0.0.0', 
    // Define uma porta fixa (padrão 5173, mudado para 3000 para facilitar)
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  }
});
