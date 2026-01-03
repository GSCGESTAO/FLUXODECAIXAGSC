
import { Transaction, Establishment, AuthorizedUser } from "../types";

/**
 * Fetches all data (Establishments, Transactions and Authorized Users) 
 */
export const fetchSheetData = async (url: string): Promise<{ 
  establishments: Establishment[], 
  transactions: Transaction[],
  authorizedUsers: AuthorizedUser[]
} | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao conectar com a planilha");
    
    const data = await response.json();
    
    if (data && Array.isArray(data.establishments) && Array.isArray(data.transactions)) {
      return {
        establishments: data.establishments,
        authorizedUsers: data.authorizedUsers || [],
        transactions: data.transactions.map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount),
        }))
      };
    }
    return null;
  } catch (error) {
    console.error("Erro na integração Sheets:", error);
    return null;
  }
};

/**
 * Sends a new transaction to the Google Sheet.
 */
export const postTransactionToSheet = async (url: string, transaction: Transaction): Promise<boolean> => {
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    return true;
  } catch (error) {
    console.error("Erro ao salvar na planilha:", error);
    return false;
  }
};
