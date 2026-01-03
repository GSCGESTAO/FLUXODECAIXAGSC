
import { Establishment, Transaction, TransactionStatus, TransactionType } from "./types";

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DE INTEGRAÇÃO
// ---------------------------------------------------------------------------

// 1. OBTENHA NO GOOGLE CLOUD CONSOLE (APIs e Serviços > Credenciais)
// Deve ser um "ID do cliente OAuth 2.0" para "Aplicativo da Web".
// Adicione a URL do seu site (ex: http://localhost:5173) nas "Origens JavaScript autorizadas".
export const GOOGLE_CLIENT_ID = '552890785096-8lv9u8293bikigrvpu3sk5lsqoigeidq.apps.googleusercontent.com';

// 2. OBTENHA NO APPS SCRIPT (Implantar > Nova implantação > App da Web)
// Certifique-se de configurar "Quem pode acessar" como "Qualquer pessoa".
export const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbx-Eq-hC-h_FlSkSV2GUJSRQK5w7CevbQ4W8uXBA3dBgONzX6KV-YJuk5Uc497TKABN/exec'; 

// ---------------------------------------------------------------------------

export const MOCK_ESTABLISHMENTS: Establishment[] = [
  { id: '1', name: 'Villa Montese', responsibleEmail: 'gerente@villamontese.com' },
  { id: '2', name: 'Don Macedo', responsibleEmail: 'gerente@donmacedo.com' },
  { id: '3', name: 'Cantina da Nonna', responsibleEmail: 'admin@cantina.com' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    establishmentId: '1',
    type: TransactionType.ENTRADA,
    amount: 1200.50,
    description: 'Vendas Almoço',
    status: TransactionStatus.APROVADO,
    user: 'operador@gsc.com'
  }
];

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
