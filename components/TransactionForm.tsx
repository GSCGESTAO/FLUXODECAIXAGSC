
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, TransactionStatus, AppSettings } from '../types';
import { checkAnomaly } from '../services/geminiService';

interface TransactionFormProps {
  establishments: Establishment[];
  onSave: (transaction: Transaction) => void;
  userEmail: string;
  settings: AppSettings;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ establishments, onSave, userEmail, settings }) => {
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
             <input type="number" step="0.01" inputMode="decimal" required min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-3xl font-black pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="0.00" />
          </div>
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
