import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

// Configuração para simular __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- CONFIGURAÇÃO DA REDE ---
const PORT = process.env.PORT || 3000; // Porta que será aberta
const HOST = '0.0.0.0'; // Permite conexões de qualquer IP na rede

// Serve os arquivos estáticos gerados pelo comando 'npm run build'
// Certifique-se de ter rodado o build antes de iniciar este servidor
app.use(express.static(path.join(__dirname, 'dist')));

// Redirecionamento SPA (Single Page Application)
// Qualquer rota não encontrada acima é redirecionada para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log('---------------------------------------------------');
  console.log(`🚀 Servidor Fluxo GSC rodando!`);
  console.log(`📡 Acesso Local:   http://localhost:${PORT}`);
  console.log(`🌐 Acesso na Rede: http://${getNetworkIp()}:${PORT}`);
  console.log('---------------------------------------------------');
});

// Função utilitária para descobrir o IP da máquina na rede
function getNetworkIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Pula endereços internos e não-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'SEU_IP_DE_REDE';
}