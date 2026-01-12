
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, AppSettings, UserRole } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

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
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormAmount, setEditFormAmount] = useState('');
  const [editFormDesc, setEditFormDesc] = useState('');
  const [editFormType, setEditFormType] = useState<TransactionType>(TransactionType.SAIDA);

  const establishment = establishments.find(e => e.id === id);
  const estTransactions = useMemo(() => {
    return transactions
      .filter(t => t.establishmentId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, id]);

  const balance = useMemo(() => estTransactions.reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0), [estTransactions]);

  if (!establishment) return <div>Estabelecimento não encontrado.</div>;

  const startEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditFormAmount(t.amount.toString());
    setEditFormDesc(t.description);
    setEditFormType(t.type);
  };

  const handleDateDisplay = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return dateStr;
    // Retorno simplificado para dd/mm/aaaa conforme solicitado
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{establishment.name}</h2>
        </div>
        <button onClick={() => navigate(`/new?establishmentId=${establishment.id}`)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">Lançar</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
        <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">Saldo Atual</span>
        <div className={`text-4xl font-black mt-2 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{CURRENCY_FORMATTER.format(balance)}</div>
      </div>

      <div className="space-y-2">
        <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1">Movimentações</h3>
        {estTransactions.map(t => (
          <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center transition-all">
            <div className="flex items-start gap-3">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${t.type === TransactionType.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.description}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  {handleDateDisplay(t.date)} • {t.user.split('@')[0]}
                  {t.isEdited && <span className="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">Ajustado</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <div className={`font-black text-sm ${t.type === TransactionType.ENTRADA ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === TransactionType.ENTRADA ? '+' : '-'} {CURRENCY_FORMATTER.format(t.amount)}
                </div>
                {isAdmin && (
                  <button onClick={() => startEdit(t)} className="text-slate-300 hover:text-indigo-600 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border dark:border-slate-700 animate-fade-in">
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest">Ajustar Lançamento</h3>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl">
                      <button onClick={() => setEditFormType(TransactionType.ENTRADA)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.ENTRADA ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                      <button onClick={() => setEditFormType(TransactionType.SAIDA)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editFormType === TransactionType.SAIDA ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Saída</button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                        <input type="text" value={editFormDesc} onChange={e => setEditFormDesc(e.target.value)} className="w-full p-4 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-medium" />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                          <input type="number" step="0.01" value={editFormAmount} onChange={e => setEditFormAmount(e.target.value)} className="w-full p-4 pl-12 border dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-lg font-black" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setEditingTransaction(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500">Descartar</button>
                    <button onClick={() => {
                        onUpdateTransaction({ ...editingTransaction, amount: parseFloat(editFormAmount), description: editFormDesc, type: editFormType });
                        setEditingTransaction(null);
                    }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg">Gravar Alteração</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
