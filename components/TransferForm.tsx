
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, TransactionStatus } from '../types';

interface TransferFormProps {
  establishments: Establishment[];
  onSave: (transaction: Transaction) => void;
  userEmail: string;
}

export const TransferForm: React.FC<TransferFormProps> = ({ establishments, onSave, userEmail }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const paramSourceId = searchParams.get('sourceId');
  const paramTargetId = searchParams.get('targetId');
  const paramAmount = searchParams.get('amount');
  const paramDescription = searchParams.get('description');

  const [sourceId, setSourceId] = useState<string>(paramSourceId || establishments[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(() => {
    if (paramTargetId) return paramTargetId;
    const initialSource = paramSourceId || establishments[0]?.id || '';
    const otherEst = establishments.find(e => e.id !== initialSource);
    return otherEst ? otherEst.id : '';
  });

  const [amount, setAmount] = useState<string>(paramAmount || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState<string>(paramDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceId === targetId) {
      alert("A origem e o destino não podem ser o mesmo estabelecimento.");
      return;
    }
    if (!observation.trim()) {
      alert("O motivo da transferência é obrigatório.");
      return;
    }

    setIsSubmitting(true);

    const numericAmount = parseFloat(amount) || 0;
    const sourceEst = establishments.find(e => e.id === sourceId);
    const targetEst = establishments.find(e => e.id === targetId);

    if (!sourceEst || !targetEst) return;

    const enrichedDescOut = `Transferência para ${targetEst.name} - ${observation}`;
    const enrichedDescIn = `Recebido de ${sourceEst.name} - ${observation}`;

    const transactionOut: Transaction = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(),
      establishmentId: sourceId,
      type: TransactionType.SAIDA,
      amount: numericAmount,
      description: enrichedDescOut,
      observations: observation,
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
      description: enrichedDescIn,
      observations: observation,
      status: TransactionStatus.APROVADO,
      user: userEmail
    };

    await onSave(transactionOut);
    await onSave(transactionIn);

    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        
        {/* Header Fixo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Transferência Direta</h2>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Formulário com scroll interno e rodapé fixo */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {/* Visual Flow Compacto */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                <div className="flex-1">
                    <label className="block text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1.5">Origem</label>
                    <select 
                        value={sourceId} 
                        onChange={(e) => {
                          setSourceId(e.target.value);
                          if (e.target.value === targetId) {
                             const other = establishments.find(est => est.id !== e.target.value);
                             if (other) setTargetId(other.id);
                          }
                        }} 
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-800 text-xs font-bold"
                    >
                        {establishments.map(est => (
                            <option key={est.id} value={est.id}>{est.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-slate-400 shadow-sm shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </div>

                <div className="flex-1">
                    <label className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Destino</label>
                    <select 
                        value={targetId} 
                        onChange={(e) => setTargetId(e.target.value)} 
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-800 text-xs font-bold"
                    >
                        {establishments.map(est => (
                            <option key={est.id} value={est.id} disabled={est.id === sourceId}>{est.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        inputMode="decimal"
                        required 
                        min="0.01" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        className="w-full text-2xl font-black pl-10 pr-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" 
                        placeholder="0,00" 
                      />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-bold h-[58px]" />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo da Transferência (Obrigatório)</label>
                <textarea 
                  required
                  value={observation} 
                  onChange={(e) => setObservation(e.target.value)} 
                  rows={2}
                  className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none bg-slate-50 dark:bg-slate-900 text-sm font-bold resize-none focus:ring-4 focus:ring-amber-500/10" 
                  placeholder="Ex: Cobertura de fornecedor, Ajuste de caixa..." 
                />
            </div>
          </div>

          {/* Footer Fixo */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !amount || !observation.trim()} 
                className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? 'bg-slate-400' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                {isSubmitting ? 'Processando...' : 'Confirmar Transferência'}
                {!isSubmitting && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};
