
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Establishment, Transaction, TransactionType, TransactionStatus } from '../types';
import { getSmartSuggestions, checkAnomaly } from '../services/geminiService';

interface TransactionFormProps {
  establishments: Establishment[];
  onSave: (transaction: Transaction) => void;
  userEmail: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ establishments, onSave, userEmail }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parse params from AI or internal navigation
  const paramEstId = searchParams.get('establishmentId');
  const paramAmount = searchParams.get('amount');
  const paramDescription = searchParams.get('description');
  const paramType = searchParams.get('type') as TransactionType;

  const [establishmentId, setEstablishmentId] = useState<string>(
    paramEstId || establishments[0]?.id || ''
  );
  
  const [type, setType] = useState<TransactionType>(paramType || TransactionType.SAIDA);
  const [amount, setAmount] = useState<string>(paramAmount || '');
  const [description, setDescription] = useState<string>(paramDescription || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState<string>('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuggestions = async () => {
    if (!establishmentId) return;
    setLoadingSuggestions(true);
    const estName = establishments.find(e => e.id === establishmentId)?.name || '';
    const results = await getSmartSuggestions(estName, type, description);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [establishmentId, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAnomalyWarning(null);

    const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    
    // Anomaly check only if not already warned
    if (!anomalyWarning) {
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
    if (paramEstId) {
        navigate(`/establishment/${paramEstId}`);
    } else {
        navigate('/');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-300">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nova Transação</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <button type="button" onClick={() => setType(TransactionType.ENTRADA)} className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${type === TransactionType.ENTRADA ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Entrada</button>
          <button type="button" onClick={() => setType(TransactionType.SAIDA)} className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${type === TransactionType.SAIDA ? 'bg-white dark:bg-slate-600 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Saída</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
          <input type="number" step="0.01" required min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-2xl font-bold p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="0,00" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estabelecimento</label>
          <select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            {establishments.map(est => (<option key={est.id} value={est.id}>{est.name}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
          <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="Ex: Pagamento Fornecedor..." />
          <div className="mt-2 flex flex-wrap gap-2 min-h-[30px]">
            {suggestions.map((sug, idx) => (
              <button key={idx} type="button" onClick={() => setDescription(sug)} className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">{sug}</button>
            ))}
          </div>
        </div>

        {anomalyWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex gap-3 items-start animate-pulse">
             <svg className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             <div>
               <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Atenção: Possível Inconsistência</h4>
               <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{anomalyWarning}</p>
             </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={`flex-1 py-3 px-4 text-white rounded-xl font-medium transition-colors shadow-md ${type === TransactionType.ENTRADA ? 'bg-emerald-600' : 'bg-indigo-600'} ${isSubmitting ? 'opacity-70' : ''}`}>
            {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
};
