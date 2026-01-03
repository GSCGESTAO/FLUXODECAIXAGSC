
import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../types";

// Models selected based on complexity guidelines
const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

export interface AiAssistantResponse {
  answer: string;
  suggestedTransaction?: {
    type: TransactionType;
    amount: number;
    description: string;
    establishmentId?: string;
  };
}

/**
 * Suggests descriptions based on establishment and transaction type.
 * Uses gemini-3-flash-preview for basic text tasks.
 */
export const getSmartSuggestions = async (
  establishmentName: string,
  type: TransactionType,
  currentInput: string
): Promise<string[]> => {
  try {
    // Fixed: Using process.env.API_KEY as required by the library guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Você é um assistente financeiro para redes de restaurantes e hotéis.
      Estou registrando uma transação de ${type} para o estabelecimento "${establishmentName}".
      ${currentInput ? `O usuário começou a digitar: "${currentInput}".` : ''}
      
      Sugira 5 descrições curtas e comuns para este tipo de transação em um restaurante ou hotel.
      Retorne APENAS um array JSON de strings.
      Exemplo: ["Pagamento Fornecedor", "Compra Bebidas", "Manutenção", "Vale Transporte", "Enxoval"]
    `;

    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    return JSON.parse(jsonStr) as string[];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

/**
 * Checks for anomalies in the transaction.
 * Uses gemini-3-pro-preview for complex reasoning tasks.
 */
export const checkAnomaly = async (
  establishmentName: string,
  type: TransactionType,
  amount: number,
  description: string
): Promise<{ isAnomalous: boolean; reason: string }> => {
  try {
    // Fixed: Using process.env.API_KEY as required by the library guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Analise a seguinte transação financeira de um estabelecimento (restaurante ou hotel) para detectar anomalias ou erros de digitação.
      Estabelecimento: ${establishmentName}
      Tipo: ${type}
      Descrição: ${description}
      Valor: R$ ${amount}

      É normal um valor desse montante para essa descrição neste contexto? 
      Se o valor for muito alto ou muito baixo para o contexto, marque como anômalo.
    `;

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAnomalous: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isAnomalous", "reason"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    const result = JSON.parse(jsonStr);
    return {
      isAnomalous: result.isAnomalous || false,
      reason: result.reason || ""
    };

  } catch (error) {
    console.error("Error checking anomaly:", error);
    return { isAnomalous: false, reason: "" };
  }
};

/**
 * Answers questions and potentially suggests transaction logging.
 * Uses gemini-3-pro-preview for complex data extraction and reasoning.
 */
export const askFinancialAssistant = async (
  establishmentName: string,
  transactions: any[],
  establishments: any[],
  question: string
): Promise<AiAssistantResponse> => {
  try {
    // Fixed: Using process.env.API_KEY as required by the library guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const recentTransactions = transactions.slice(0, 100);
    
    const contextData = {
      establishments: establishments.map(e => ({ id: e.id, name: e.name })),
      transactions: recentTransactions.map(t => ({
        date: t.date,
        type: t.type,
        val: t.amount,
        desc: t.description,
        estId: t.establishmentId
      }))
    };

    const prompt = `
      Você é um analista financeiro inteligente para uma rede de restaurantes e hotéis.
      Contexto: ${establishmentName === "Toda a Rede" ? "Toda a rede" : `Estabelecimento ${establishmentName}`}.
      
      Dados: ${JSON.stringify(contextData)}

      USUÁRIO DISSE: "${question}"

      TAREFAS:
      1. Responda à pergunta do usuário de forma útil e direta.
      2. Se o usuário estiver expressando o desejo de LANÇAR ou REGISTRAR uma nova transação (ex: "Lançar gasto de 50 reais com limpeza"), extraia os dados.
      
      Regras para extração:
      - amount: apenas número.
      - type: "Entrada" ou "Saída".
      - description: descrição curta.
      - establishmentId: tente encontrar o ID do estabelecimento se o usuário mencionou um nome da lista fornecida.

      Retorne um JSON com:
      {
        "answer": "Sua resposta em texto aqui",
        "suggestedTransaction": { "type": "Saída", "amount": 50, "description": "Limpeza", "establishmentId": "id_aqui" } // (opcional)
      }
    `;

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            suggestedTransaction: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["Entrada", "Saída"] },
                amount: { type: Type.NUMBER },
                description: { type: Type.STRING },
                establishmentId: { type: Type.STRING }
              },
              required: ["type", "amount", "description"]
            }
          },
          required: ["answer"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as AiAssistantResponse;
  } catch (error) {
    console.error("Error querying transactions:", error);
    return { answer: "Erro ao processar sua pergunta com a IA." };
  }
};
