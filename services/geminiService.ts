
import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../types";

// Models selected based on complexity guidelines
const FLASH_MODEL = 'gemini-3.5-flash';
const PRO_MODEL = 'gemini-3.5-flash';

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
    // Fixed: Using process.env.GEMINI_API_KEY with process.env.API_KEY fallback and adding telemetry header
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
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
    // Fixed: Using process.env.GEMINI_API_KEY with process.env.API_KEY fallback and adding telemetry header
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

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
    // Fixed: Using process.env.GEMINI_API_KEY with process.env.API_KEY fallback and adding telemetry header
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Calcular saldos atuais agregados para contextualizar a IA com precisão matemática
    const establishmentBalances = establishments.map(e => {
      const estTrans = transactions.filter(t => t.establishmentId === e.id);
      const balance = estTrans.reduce((sum, t) => {
        return t.type === TransactionType.ENTRADA || t.type === "Entrada"
          ? sum + Number(t.amount || 0)
          : sum - Number(t.amount || 0);
      }, 0);
      return {
        id: e.id,
        name: e.name,
        currentBalance: balance
      };
    });

    // Datas extremas no banco de dados
    const dates = transactions.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
    const minDateStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('pt-BR') : 'N/A';
    const maxDateStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('pt-BR') : 'N/A';

    // Pega as últimas transações para contextualizar o prompt sem sobrecarregar o limite
    const recentTransactions = transactions.slice(-120);
    
    const contextData = {
      establishmentName,
      minTransactionDate: minDateStr,
      maxTransactionDate: maxDateStr,
      establishments: establishmentBalances,
      transactions: recentTransactions.map(t => ({
        date: t.date,
        type: t.type,
        val: t.amount,
        desc: t.description,
        estId: t.establishmentId
      }))
    };

    const prompt = `
      Você é um especialista em controladoria e analista financeiro sênior para a rede de restaurantes e hotéis "Fluxo GSC".
      Você deve tirar dúvidas do usuário com total precisão matemática, clareza administrativa e didática exemplar.

      DADOS ATUAIS DA REDE:
      ${JSON.stringify(contextData)}

      REGRAS ESSENCIAIS DE CONTABILIDADE E FLUXO DE CAIXA NO FLUXO GSC:
      
      1. Como funcionam os relatórios por período (data inicial a data final):
         - "Saldo Anterior": É o saldo acumulado de todas as transações (Entradas [+] menos Saídas [-]) ocorridas ANTERIORES à data inicial do relatório. Representa o valor em caixa que o período herdou do passado.
         - "Total Entradas": É a soma simples das entradas ocorridas dentro do período selecionado.
         - "Total Saídas": É a soma simples das saídas ocorridas dentro do período selecionado.
         - "Saldo Final": É o saldo consolidado ao término do período, calculado rigorosamente como:
           Saldo Final = Saldo Anterior + Total Entradas - Total Saídas
           
      2. Regra Matemática da Equivalência de Períodos:
         - Se o usuário perguntar/comparar dois relatórios com datas de início diferentes que terminam na mesma data final (ex: "28/05 a 01/06" vs "13/05 a 01/06"):
           * EXPLIQUE que o "Saldo Final" DEVERÁ SER E É EXATAMENTE O MESMO em ambos os casos.
           * POR QUÊ? Porque o "Saldo Final" é o acumulado total desde o início dos tempos até a data final selecionada (e como a data final, por exemplo, 01/06, é a mesma em ambos, o montante total de caixa acumulado até essa data é idêntico).
           * Como a partição compensa isso?
             - No período mais curto (ex: 28/05 a 01/06): mais transações passadas ficam contidas dentro do saldo anterior (ou seja, o "Saldo Anterior" começa maior), o que compensa perfeitamente o fato de que as entradas e saídas do período curto parecem menores.
             - No período mais longo (ex: 13/05 a 01/06): as entradas e saídas do período serão maiores (pois cobrem uma janela maior de dias), mas o "Saldo Anterior" (anterior a 13/05) será menor para equilibrar perfeitamente, resultando no exato mesmo "Saldo Final".
           * Explique isso com calma, usando números do exemplo se necessário, mostrando que isso prova a integridade algébrica perfeita do sistema de caixa acumulado do Fluxo GSC.

      USUÁRIO DISSE: "${question}"

      TAREFAS:
      1. Responda à pergunta ou dúvida do usuário em português do Brasil com um tom profissional, acolhedor, transparente e altamente esclarecedor.
      2. Se o usuário estiver expressando o desejo de LANÇAR ou REGISTRAR uma nova transação (ex: "Lançar gasto de 50 reais com limpeza"), extraia os dados.
      
      Regras para extração:
      - amount: apenas número.
      - type: "Entrada" ou "Saída".
      - description: descrição curta.
      - establishmentId: tente encontrar o ID do estabelecimento se o usuário mencionou um nome da lista fornecida.

      Retorne um JSON com:
      {
        "answer": "Sua resposta explicativa em texto detalhando os conceitos econômicos ou matemáticos com clareza",
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
