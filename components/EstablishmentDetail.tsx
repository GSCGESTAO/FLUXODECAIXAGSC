
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const isAdmin = userRole === 'Admin';
  const isFinanceiro = userRole === 'Financeiro';
  
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Estados do formulário de edição
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

  const editingTransaction = useMemo(() => transactions.find(t => t.id === editId), [transactions, editId]);

  useEffect(() => {
    if (editingTransaction) {
      setEditFormAmount(editingTransaction.amount.toString());
      setEditFormDesc(editingTransaction.description);
      setEditFormType(editingTransaction.type);
      setEditFormEstId(editingTransaction.establishmentId);
      setCaptchaChallenge({ a: Math.floor(Math.random() * 10), b: Math.floor(Math.random() * 10) });
      setCaptchaInput('');
    }
  }, [editingTransaction]);

  // Impede rolagem do fundo quando o modal está aberto
  useEffect(() => {
    if (editId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [editId]);

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
    setSearchParams({ editId: t.id });
  };

  const closeEdit = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('editId');
    setSearchParams(newParams);
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
    <div className="space-y-6 relative min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{establishment.name}</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate(`/transfer?sourceId=${establishment.id}`)} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:scale-105 active:scale-95">Transferir</button>
            <button onClick={() => navigate(`/new?establishmentId=${establishment.id}`)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:scale-105 active:scale-95">Lançar</button>
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
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Qual foi o maior gasto dessa semana?' className="w-full p-4 pr-32 rounded-2xl border dark:border-slate-700 outline-none text-sm font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20" />
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

      {/* Pop-up de Edição Centralizado e Persistente */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ${editId ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${editId ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
              
              {/* Header Fixo do Pop-up */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Corrigir Lançamento</h3>
                </div>
                <button onClick={closeEdit} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Corpo com Scroll Interno para garantir que os botões caibam */}
              <div className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide">
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl">
                    <button type="button" onClick={() => setEditFormType(TransactionType.ENTRADA)} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.ENTRADA ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Entrada</button>
                    <button type="button" onClick={() => setEditFormType(TransactionType.SAIDA)} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.SAIDA ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-slate-500'}`}>Saída</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</label>
                        <select value={editFormEstId} onChange={e => setEditFormEstId(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-900 text-xs font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/10">
                          {establishments.map(est => (
                            <option key={est.id} value={est.id}>{est.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                        <input type="number" step="0.01" value={editFormAmount} onChange={e => setEditFormAmount(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-900 text-xl font-black shadow-sm focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                    <input type="text" value={editFormDesc} onChange={e => setEditFormDesc(e.target.value)} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/10" />
                  </div>

                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Verificação de Segurança</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Quanto é {captchaChallenge.a} + {captchaChallenge.b}?</span>
                          <input type="number" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Resultado" />
                      </div>
                  </div>
              </div>
              
              {/* Footer Fixo do Pop-up - Sempre Visível */}
              <div className="p-8 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <div className="flex gap-3">
                    <button onClick={closeEdit} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 active:scale-95 transition-all hover:bg-slate-100">Cancelar</button>
                    <button onClick={() => {
                        if (parseInt(captchaInput) !== (captchaChallenge.a + captchaChallenge.b)) { alert("Cálculo incorreto!"); return; }
                        if (editingTransaction) {
                          onUpdateTransaction({ 
                            ...editingTransaction, 
                            amount: parseFloat(editFormAmount), 
                            description: editFormDesc, 
                            type: editFormType,
                            establishmentId: editFormEstId,
                            isEdited: true 
                          });
                        }
                        closeEdit();
                    }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 hover:bg-indigo-700">Gravar Alteração</button>
                </div>
              </div>
          </div>
      </div>
    </div>
  );
};
