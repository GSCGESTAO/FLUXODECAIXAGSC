
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
  const isFinanceiro = userRole === 'Financeiro';
  
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [captchaChallenge, setCaptchaChallenge] = useState<{a: number, b: number}>({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState('');
  const [editFormAmount, setEditFormAmount] = useState('');
  const [editFormDesc, setEditFormDesc] = useState('');
  const [editFormType, setEditFormType] = useState<TransactionType>(TransactionType.SAIDA);
  const [editFormEstId, setEditFormEstId] = useState<string>('');

  const establishment = establishments.find(e => e.id === id);
  const estTransactions = useMemo(() => {
    return transactions
      .filter(t => t.establishmentId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, id]);

  const balance = useMemo(() => estTransactions.reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0), [estTransactions]);

  if (!establishment) return <div className="p-10 text-center font-bold">Unidade não localizada.</div>;

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
    setEditFormType(t.type);
    setEditFormEstId(t.establishmentId);
    setCaptchaChallenge({ a: Math.floor(Math.random() * 10), b: Math.floor(Math.random() * 10) });
    setCaptchaInput('');
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{establishment.name}</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate(`/transfer?sourceId=${establishment.id}`)} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Transferir</button>
            <button onClick={() => navigate(`/new?establishmentId=${establishment.id}`)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Lançar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
        <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Saldo Disponível</span>
        <div className={`text-4xl font-black mt-2 tracking-tighter ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{CURRENCY_FORMATTER.format(balance)}</div>
      </div>

      {settings.showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase">Assistente IA</h3>
          </div>
          <form onSubmit={handleAskAI} className="relative group">
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Qual foi o maior gasto dessa semana?' className="w-full p-4 pr-32 rounded-2xl border dark:border-slate-700 outline-none text-sm font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
              <button type="submit" disabled={loadingAi || !question.trim()} className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-5 rounded-xl text-[10px] font-black uppercase">{loadingAi ? '...' : 'Analisar'}</button>
          </form>
          {aiResponse && <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">{aiResponse.answer}</div>}
        </div>
      )}

      <div>
        <h3 className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Movimentações</h3>
        <div className="space-y-3">
          {estTransactions.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center group hover:border-indigo-100 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-2 w-2.5 h-2.5 rounded-full ${t.type === TransactionType.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.description}</div>
                    {t.isEdited && (
                      <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">Editado</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                    {formatDateDisplay(t.date)} • {t.user.split('@')[0]}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className={`font-black text-sm tracking-tighter ${t.type === TransactionType.ENTRADA ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.ENTRADA ? '+' : '-'} {CURRENCY_FORMATTER.format(t.amount)}
                  </div>
                  {(isAdmin || isFinanceiro) && (
                    <button onClick={() => startEdit(t)} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                  )}
              </div>
            </div>
          ))}
          {estTransactions.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic text-sm">Nenhum lançamento encontrado.</div>
          )}
        </div>
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-fade-in border dark:border-slate-700">
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-center">Corrigir Lançamento</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl mb-4">
                      <button type="button" onClick={() => setEditFormType(TransactionType.ENTRADA)} className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.ENTRADA ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Entrada</button>
                      <button type="button" onClick={() => setEditFormType(TransactionType.SAIDA)} className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.SAIDA ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-slate-500'}`}>Saída</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</label>
                      <select value={editFormEstId} onChange={e => setEditFormEstId(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-bold">
                        {establishments.map(est => (
                          <option key={est.id} value={est.id}>{est.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                      <input type="text" value={editFormDesc} onChange={e => setEditFormDesc(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                      <input type="number" step="0.01" value={editFormAmount} onChange={e => setEditFormAmount(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-2xl font-black" />
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 mt-4">
                        <span className="block text-[10px] font-black text-indigo-500 mb-2 uppercase tracking-widest">Confirme: {captchaChallenge.a} + {captchaChallenge.b} = ?</span>
                        <input type="number" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm font-black text-indigo-600" />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setEditingTransaction(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                    <button onClick={() => {
                        if (parseInt(captchaInput) !== (captchaChallenge.a + captchaChallenge.b)) { alert("Cálculo incorreto!"); return; }
                        onUpdateTransaction({ 
                          ...editingTransaction, 
                          amount: parseFloat(editFormAmount), 
                          description: editFormDesc, 
                          type: editFormType,
                          establishmentId: editFormEstId,
                          isEdited: true 
                        });
                        setEditingTransaction(null);
                    }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Gravar Alteração</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
