
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, TransactionStatus } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TransferFormProps {
  establishments: Establishment[];
  onSave: (transaction: Transaction) => void;
  userEmail: string;
}

export const TransferForm: React.FC<TransferFormProps> = ({ establishments, onSave, userEmail }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramSourceId = searchParams.get('sourceId');

  const [sourceId, setSourceId] = useState<string>(paramSourceId || establishments[0]?.id || '');
  
  // Inicializa o destino com um ID diferente da origem (se possível)
  const [targetId, setTargetId] = useState<string>(() => {
    const initialSource = paramSourceId || establishments[0]?.id || '';
    const otherEst = establishments.find(e => e.id !== initialSource);
    return otherEst ? otherEst.id : '';
  });

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceId === targetId) {
      alert("A origem e o destino não podem ser o mesmo estabelecimento.");
      return;
    }

    setIsSubmitting(true);

    const numericAmount = parseFloat(amount) || 0;
    const sourceEst = establishments.find(e => e.id === sourceId);
    const targetEst = establishments.find(e => e.id === targetId);

    if (!sourceEst || !targetEst) return;

    const transactionOut: Transaction = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(),
      establishmentId: sourceId,
      type: TransactionType.SAIDA,
      amount: numericAmount,
      description: `Transferência para ${targetEst.name}`,
      observations: `Ref: ${observation}`,
      status: TransactionStatus.APROVADO,
      user: userEmail
    };

    const transactionIn: Transaction = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(),
      establishmentId: targetId,
      type: TransactionType.ENTRADA,
      amount: numericAmount,
      description: `Recebido de ${sourceEst.name}`,
      observations: `Ref: ${observation}`,
      status: TransactionStatus.APROVADO,
      user: userEmail
    };

    await onSave(transactionOut);
    await onSave(transactionIn);

    navigate('/');
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Transferência entre Contas</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors relative overflow-hidden">
        
        {/* Visual Flow */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex-1 w-full">
                <label className="block text-[10px] font-black text-rose-500 uppercase mb-1 tracking-widest">Origem</label>
                <select 
                    value={sourceId} 
                    onChange={(e) => {
                      setSourceId(e.target.value);
                      if (e.target.value === targetId) {
                         const other = establishments.find(est => est.id !== e.target.value);
                         if (other) setTargetId(other.id);
                      }
                    }} 
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                    {establishments.map(est => (
                        <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-700 text-amber-500 shadow-sm shrink-0 border border-slate-100 dark:border-slate-600">
                <svg className="w-6 h-6 rotate-90 md:rotate-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
            </div>

            <div className="flex-1 w-full">
                <label className="block text-[10px] font-black text-emerald-500 uppercase mb-1 tracking-widest">Destino</label>
                <select 
                    value={targetId} 
                    onChange={(e) => setTargetId(e.target.value)} 
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                    {establishments.map(est => (
                        <option key={est.id} value={est.id} disabled={est.id === sourceId}>{est.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="space-y-6">
            <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01" 
              inputMode="decimal"
              required 
              min="0.01" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full text-4xl font-black p-4 border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-200" 
              placeholder="0.00" 
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observação</label>
                    <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)} className="w-full p-3.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" placeholder="Ex: Ajuste de caixa" />
                </div>
            </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button type="submit" disabled={isSubmitting || !amount} className={`w-full py-5 px-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 active:scale-95'}`}>
                {isSubmitting ? 'Processando...' : 'Confirmar Transferência'}
                {!isSubmitting && (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                )}
            </button>
            <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest">
                Gerará automaticamente uma saída na origem e entrada no destino.
            </p>
        </div>
      </form>
    </div>
  );
};
