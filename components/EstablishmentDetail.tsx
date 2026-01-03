
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Establishment, Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface EstablishmentDetailProps {
  establishments: Establishment[];
  transactions: Transaction[];
  onUpdateTransaction: (t: Transaction) => void;
}

const IS_ADMIN = true;

export const EstablishmentDetail: React.FC<EstablishmentDetailProps> = ({ establishments, transactions, onUpdateTransaction }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // AI Query State
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Edit/Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [captchaChallenge, setCaptchaChallenge] = useState<{a: number, b: number}>({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState('');
  const [editFormAmount, setEditFormAmount] = useState('');
  const [editFormDesc, setEditFormDesc] = useState('');

  const establishment = establishments.find(e => e.id === id);
  
  const estTransactions = useMemo(() => {
    return transactions
      .filter(t => t.establishmentId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, id]);

  const balance = useMemo(() => {
    return estTransactions.reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  }, [estTransactions]);

  if (!establishment) {
    return <div>Estabelecimento não encontrado.</div>;
  }

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoadingAi(true);
    setAiResponse(null);
    
    const result = await askFinancialAssistant(establishment.name, estTransactions, establishments, question);
    
    setAiResponse(result);
    setLoadingAi(false);
  };

  const openSuggestedTransaction = (sug: NonNullable<AiAssistantResponse['suggestedTransaction']>) => {
    const params = new URLSearchParams();
    if (sug.amount) params.set('amount', sug.amount.toString());
    if (sug.description) params.set('description', sug.description);
    if (sug.type) params.set('type', sug.type);
    params.set('establishmentId', sug.establishmentId || establishment.id);
    
    navigate(`/new?${params.toString()}`);
  };

  const generateCaptcha = () => {
    return { a: Math.floor(Math.random() * 10), b: Math.floor(Math.random() * 10) };
  };

  const startEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditFormAmount(t.amount.toString());
    setEditFormDesc(t.description);
    setCaptchaChallenge(generateCaptcha());
    setCaptchaInput('');
  };

  const closeEdit = () => setEditingTransaction(null);

  const saveEdit = () => {
    if (!editingTransaction) return;
    const sum = captchaChallenge.a + captchaChallenge.b;
    if (parseInt(captchaInput) !== sum) {
      alert("Captcha incorreto!");
      setCaptchaChallenge(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    onUpdateTransaction({
      ...editingTransaction,
      amount: parseFloat(editFormAmount),
      description: editFormDesc
    });
    closeEdit();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{establishment.name}</h2>
        </div>
        
        <div className="flex gap-2">
            <button
              onClick={() => navigate(`/transfer?sourceId=${establishment.id}`)}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8l4 4m0 0l-4 4m4-4H3m13-4V4m-4 16v-4"/></svg>
              <span className="hidden sm:inline">Transferir</span>
            </button>
            
            <button
              onClick={() => navigate(`/new?establishmentId=${establishment.id}`)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Lançar</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center transition-colors">
        <span className="text-sm text-slate-500 dark:text-slate-400 uppercase font-medium">Saldo Atual</span>
        <div className={`text-4xl font-bold mt-2 ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {CURRENCY_FORMATTER.format(balance)}
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-indigo-100 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            </div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Pergunte à IA</h3>
        </div>
        
        <form onSubmit={handleAskAI} className="relative">
            <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='Ex: "Lançar 150 reais de compra de mercado"'
                className="w-full p-3 pr-24 rounded-lg border border-indigo-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button 
                type="submit"
                disabled={loadingAi || !question.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-3 rounded-md text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                {loadingAi ? '...' : 'Enviar'}
            </button>
        </form>

        {aiResponse && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-indigo-50 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm leading-relaxed shadow-sm">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">Resposta:</span>
              {aiResponse.answer}
            </div>

            {aiResponse.suggestedTransaction && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg animate-fade-in shadow-inner">
                 <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                   Sugerido: <strong>{aiResponse.suggestedTransaction.description}</strong> ({CURRENCY_FORMATTER.format(aiResponse.suggestedTransaction.amount)})
                 </div>
                 <button 
                  onClick={() => openSuggestedTransaction(aiResponse.suggestedTransaction!)}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-emerald-700 shadow-sm"
                 >
                   Preencher Lançamento
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-3">Histórico de Transações</h3>
        <div className="space-y-3">
          {estTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Nenhuma transação registrada.</div>
          ) : (
            estTransactions.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center group transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${t.type === TransactionType.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{t.description}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')} • {t.user.split('@')[0]}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className={`font-bold ${t.type === TransactionType.ENTRADA ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.type === TransactionType.ENTRADA ? '+' : '-'} {CURRENCY_FORMATTER.format(t.amount)}
                    </div>
                    {IS_ADMIN && (
                        <button onClick={() => startEdit(t)} className="text-slate-300 hover:text-indigo-600 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl border dark:border-slate-700 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Ajuste</h3>
                <div className="space-y-4">
                    <input type="text" value={editFormDesc} onChange={e => setEditFormDesc(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                    <input type="number" step="0.01" value={editFormAmount} onChange={e => setEditFormAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                        <span className="block text-xs font-bold text-slate-500 mb-2">Segurança: {captchaChallenge.a} + {captchaChallenge.b} = ?</span>
                        <input type="number" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={closeEdit} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancelar</button>
                    <button onClick={saveEdit} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Salvar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
