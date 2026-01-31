
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, TransactionStatus, AppSettings } from '../types';
import { checkAnomaly } from '../services/geminiService';
import { CURRENCY_FORMATTER } from '../constants';

interface TransactionFormProps {
  establishments: Establishment[];
  transactions: Transaction[];
  onSave: (transaction: Transaction) => void;
  userEmail: string;
  settings: AppSettings;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ establishments, transactions, onSave, userEmail, settings }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const paramEstId = searchParams.get('establishmentId');
  const paramAmount = searchParams.get('amount');
  const paramDescription = searchParams.get('description');
  const paramType = searchParams.get('type') as TransactionType;

  const [establishmentId, setEstablishmentId] = useState<string>(paramEstId || establishments[0]?.id || '');
  const [type, setType] = useState<TransactionType>(paramType || TransactionType.SAIDA);
  const [amount, setAmount] = useState<string>(paramAmount || '');
  const [description, setDescription] = useState<string>(paramDescription || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState<string>('');
  const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceBorrowId, setSourceBorrowId] = useState<string>('');

  const currentBalance = useMemo(() => {
    return transactions
      .filter(t => t.establishmentId === establishmentId)
      .reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, establishmentId]);

  const numericAmount = parseFloat(amount) || 0;
  const isNegativeAfter = type === TransactionType.SAIDA && numericAmount > currentBalance;

  useEffect(() => {
    if (paramEstId) {
      setEstablishmentId(paramEstId);
    } else if (establishments.length > 0 && !establishmentId) {
      setEstablishmentId(establishments[0].id);
    }
  }, [paramEstId, establishments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAnomalyWarning(null);

    const numericAmount = parseFloat(amount) || 0;
    
    if (!anomalyWarning && settings.showAI) {
        const estName = establishments.find(e => e.id === establishmentId)?.name || '';
        const anomalyCheck = await checkAnomaly(estName, type, numericAmount, description);
        if (anomalyCheck.isAnomalous) {
            setAnomalyWarning(anomalyCheck.reason || "Valor incomum detectado.");
            setIsSubmitting(false);
            return;
        }
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(),
      establishmentId,
      type,
      amount: numericAmount,
      description,
      observations,
      status: TransactionStatus.APROVADO,
      user: userEmail
    };

    onSave(newTransaction);
    navigate(paramEstId ? `/establishment/${paramEstId}` : '/');
  };

  const handleBorrow = () => {
    if (!sourceBorrowId) return;
    const params = new URLSearchParams({
      sourceId: sourceBorrowId,
      targetId: establishmentId,
      amount: amount,
      description: `Cobertura de Saldo: ${description}`
    });
    navigate(`/transfer?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        
        {/* Header Fixo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Lançamento de Caixa</h2>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl">
              <button type="button" onClick={() => setType(TransactionType.ENTRADA)} className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === TransactionType.ENTRADA ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Entrada</button>
              <button type="button" onClick={() => setType(TransactionType.SAIDA)} className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === TransactionType.SAIDA ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm' : 'text-slate-500'}`}>Saída</button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total</label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                 <input type="number" step="0.01" inputMode="decimal" required min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full text-3xl font-black pl-12 pr-4 py-4 border rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors ${isNegativeAfter ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-200 dark:border-slate-700'}`} placeholder="0.00" />
              </div>
              {isNegativeAfter && (
                <div className="mt-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl animate-fade-in">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Saldo Insuficiente (Atual: {CURRENCY_FORMATTER.format(currentBalance)})</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">De onde quer emprestar?</label>
                    <div className="flex gap-2">
                      <select value={sourceBorrowId} onChange={(e) => setSourceBorrowId(e.target.value)} className="flex-1 p-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none">
                        <option value="">Selecionar unidade...</option>
                        {establishments.filter(e => e.id !== establishmentId).map(est => (<option key={est.id} value={est.id}>{est.name}</option>))}
                      </select>
                      <button type="button" onClick={handleBorrow} disabled={!sourceBorrowId} className="bg-amber-500 text-white px-4 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-amber-600 shadow-sm transition-all">Transferir</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Unidade</label>
                  <select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none">
                    {establishments.map(est => (<option key={est.id} value={est.id}>{est.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none" />
                </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Gasto</label>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none mb-3" placeholder="O que foi pago?" />
              
              {settings.readyDescriptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {settings.readyDescriptions.filter(d => d.trim() !== "").map((sug, idx) => (
                    <button key={idx} type="button" onClick={() => setDescription(sug)} className="text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-xl hover:border-indigo-500 transition-colors shadow-sm">{sug}</button>
                  ))}
                </div>
              )}
            </div>

            {anomalyWarning && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-2xl animate-pulse">
                   <h4 className="font-bold text-rose-800 dark:text-rose-400 text-[10px] uppercase tracking-widest">Aviso de IA</h4>
                   <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{anomalyWarning}</p>
              </div>
            )}
          </div>

          {/* Footer Fixo */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${type === TransactionType.ENTRADA ? 'bg-emerald-600' : 'bg-indigo-600'} ${isSubmitting ? 'opacity-70' : ''}`}>
              {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
