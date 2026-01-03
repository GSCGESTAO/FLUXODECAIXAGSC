
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
 * Sugere descrições baseadas no estabelecimento e tipo de transação.
 */
export const getSmartSuggestions = async (
  establishmentName: string,
  type: TransactionType,
  currentInput: string
): Promise<string[]> => {
  try {
    // Always use process.env.API_KEY to initialize GoogleGenAI.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Você é um assistente financeiro para redes de restaurantes e hotéis.
      Estou registrando uma transação de ${type} para o estabelecimento "${establishmentName}".
      ${currentInput ? `O usuário começou a digitar: "${currentInput}".` : ''}
      
      Sugira 5 descrições curtas e comuns para este tipo de transação em um restaurante ou hotel.
      Retorne APENAS um array JSON de strings.
    `;

    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        // Removed invalid 'bottomK' property.
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
 * Verifica anomalias na transação.
 */
export const checkAnomaly = async (
  establishmentName: string,
  type: TransactionType,
  amount: number,
  description: string
): Promise<{ isAnomalous: boolean; reason: string }> => {
  try {
    // Always use process.env.API_KEY to initialize GoogleGenAI.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Analise a seguinte transação financeira de um restaurante/hotel para detectar anomalias.
      Estabelecimento: ${establishmentName}
      Tipo: ${type}
      Descrição: ${description}
      Valor: R$ ${amount}
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
 * Responde perguntas e sugere lançamentos financeiros.
 */
export const askFinancialAssistant = async (
  establishmentName: string,
  transactions: any[],
  establishments: any[],
  question: string
): Promise<AiAssistantResponse> => {
  try {
    // Always use process.env.API_KEY to initialize GoogleGenAI.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const recentTransactions = transactions.slice(0, 50);
    
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
      2. Se o usuário quiser REGISTRAR algo, extraia os dados.
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
