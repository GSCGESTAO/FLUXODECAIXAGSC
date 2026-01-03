
import { Transaction, Establishment, AuthorizedUser } from "../types";

/**
 * Busca todos os dados (Estabelecimentos, Transações e Usuários Autorizados)
 */
export const fetchSheetData = async (url: string): Promise<{ 
  establishments: Establishment[], 
  transactions: Transaction[],
  authorizedUsers: AuthorizedUser[],
  notes?: string
} | null> => {
  try {
    const response = await fetch(`${url}?t=${Date.now()}`);
    if (!response.ok) throw new Error("Falha ao conectar com a planilha");
    
    const data = await response.json();
    
    if (data && Array.isArray(data.establishments)) {
      return {
        establishments: data.establishments,
        authorizedUsers: data.authorizedUsers || [],
        notes: data.notes || '',
        transactions: (data.transactions || []).map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount) || 0,
        }))
      };
    }
    return null;
  } catch (error) {
    console.error("Erro na integração Sheets (Fetch):", error);
    return null;
  }
};

/**
 * Função genérica para enviar dados para a planilha.
 */
export const postToSheet = async (url: string, action: string, payload: any): Promise<boolean> => {
  try {
    const body = JSON.stringify({
      action: action,
      ...payload
    });

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    });
    
    return true;
  } catch (error) {
    console.error(`Erro ao executar ação ${action} na planilha:`, error);
    return false;
  }
};
