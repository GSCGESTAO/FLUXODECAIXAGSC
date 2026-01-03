
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, AppSettings, UserRole } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface EstablishmentDetailProps {
  establishments: Establishment[];
  transactions: Transaction[];
  onUpdateTransaction: (t: Transaction) => void;
  settings: AppSettings;
  userRole?: UserRole | null;
}

export const EstablishmentDetail: React.FC<EstablishmentDetailProps> = ({ establishments, transactions, onUpdateTransaction, settings, userRole }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = userRole === 'Admin';
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
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

  const balance = useMemo(() => estTransactions.reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0), [estTransactions]);
  if (!establishment) return <div>Estabelecimento não encontrado.</div>;

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoadingAi(true);
    setAiResponse(null);
    const result = await askFinancialAssistant(establishment.name, estTransactions, establishments, question);
    setAiResponse(result);
    setLoadingAi(false);
  };

  const startEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditFormAmount(t.amount.toString());
    setEditFormDesc(t.description);
    setCaptchaChallenge({ a: Math.floor(Math.random() * 10), b: Math.floor(Math.random() * 10) });
    setCaptchaInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{establishment.name}</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate(`/transfer?sourceId=${establishment.id}`)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">Transferir</button>
            <button onClick={() => navigate(`/new?establishmentId=${establishment.id}`)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">Lançar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">Saldo Atual</span>
          <div className={`${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {balance >= 0 ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"></path><path d="M17 18h6v-6"></path></svg>
            )}
          </div>
        </div>
        <div className={`text-4xl font-black mt-2 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{CURRENCY_FORMATTER.format(balance)}</div>
      </div>

      {settings.showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
          <form onSubmit={handleAskAI} className="relative group">
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Falar com assistente da unidade...' className="w-full p-4 pr-32 rounded-2xl border dark:border-slate-700 outline-none text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
              <button type="submit" disabled={loadingAi || !question.trim()} className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-5 rounded-xl text-xs font-bold uppercase">{loadingAi ? '...' : 'Analisar'}</button>
          </form>
          {aiResponse && <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs leading-relaxed">{aiResponse.answer}</div>}
        </div>
      )}

      <div>
        <h3 className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest mb-3 ml-1">Lançamentos Recentes</h3>
        <div className="space-y-2">
          {estTransactions.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${t.type === TransactionType.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.description}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {t.user.split('@')[0]}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className={`font-black text-sm flex items-center gap-1 ${t.type === TransactionType.ENTRADA ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.ENTRADA ? (
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
                    ) : (
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"></path><path d="M17 18h6v-6"></path></svg>
                    )}
                    {CURRENCY_FORMATTER.format(t.amount)}
                  </div>
                  {isAdmin && <button onClick={() => startEdit(t)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-fade-in border dark:border-slate-700">
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest">Ajuste de Lançamento</h3>
                <div className="space-y-4">
                    <input type="text" value={editFormDesc} onChange={e => setEditFormDesc(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-medium" />
                    <input type="number" step="0.01" value={editFormAmount} onChange={e => setEditFormAmount(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-lg font-black" />
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <span className="block text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">Antifraude: {captchaChallenge.a} + {captchaChallenge.b} = ?</span>
                        <input type="number" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm font-bold" />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setEditingTransaction(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest">Descartar</button>
                    <button onClick={() => {
                        if (parseInt(captchaInput) !== (captchaChallenge.a + captchaChallenge.b)) { alert("Cálculo incorreto!"); return; }
                        onUpdateTransaction({ ...editingTransaction, amount: parseFloat(editFormAmount), description: editFormDesc });
                        setEditingTransaction(null);
                    }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md">Confirmar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
