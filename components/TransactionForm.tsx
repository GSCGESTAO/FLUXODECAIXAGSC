
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

  // Cálculo do saldo atual da unidade selecionada
  const currentBalance = useMemo(() => {
    return transactions
      .filter(t => t.establishmentId === establishmentId)
      .reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, establishmentId]);

  const numericAmount = parseFloat(amount) || 0;
  const isNegativeAfter = type === TransactionType.SAIDA && numericAmount > currentBalance;

  // Sincroniza o estabelecimento selecionado com o parâmetro da URL ou com a lista carregada
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

    // Se houver uma unidade de empréstimo selecionada, processa a transferência antes
    if (isNegativeAfter && sourceBorrowId) {
      const sourceEst = establishments.find(e => e.id === sourceBorrowId);
      const targetEst = establishments.find(e => e.id === establishmentId);

      if (sourceEst && targetEst) {
        // 1. Saída da unidade que empresta
        onSave({
          id: crypto.randomUUID(),
          date,
          timestamp: new Date().toISOString(),
          establishmentId: sourceBorrowId,
          type: TransactionType.SAIDA,
          amount: numericAmount,
          description: `COBERTURA AUTOMÁTICA para ${targetEst.name}: ${description}`,
          status: TransactionStatus.APROVADO,
          user: userEmail
        });

        // 2. Entrada na unidade que recebe
        onSave({
          id: crypto.randomUUID(),
          date,
          timestamp: new Date().toISOString(),
          establishmentId: establishmentId,
          type: TransactionType.ENTRADA,
          amount: numericAmount,
          description: `COBERTURA AUTOMÁTICA via ${sourceEst.name}: ${description}`,
          status: TransactionStatus.APROVADO,
          user: userEmail
        });
      }
    }

    // 3. Salva a transação original (a despesa ou entrada)
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

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Lançamento de Caixa</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
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
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Deseja transferir para cobrir?</label>
                <div className="flex gap-2">
                  <select 
                    value={sourceBorrowId} 
                    onChange={(e) => setSourceBorrowId(e.target.value)} 
                    className="flex-1 p-3 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Não transferir (deixar negativo)</option>
                    {establishments.filter(e => e.id !== establishmentId).map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                  </select>
                </div>
                {sourceBorrowId && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase mt-1 italic">Ao confirmar, uma transferência será gerada automaticamente.</p>
                )}
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
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-2xl flex gap-3 animate-pulse">
             <div className="flex-1">
               <h4 className="font-bold text-rose-800 dark:text-rose-400 text-xs uppercase tracking-widest">Alerta de Inconsistência</h4>
               <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{anomalyWarning}</p>
             </div>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={`flex-1 py-4 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg ${type === TransactionType.ENTRADA ? 'bg-emerald-600' : 'bg-indigo-600'} ${isSubmitting ? 'opacity-70' : ''}`}>
            {isSubmitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
};
