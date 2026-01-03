
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

    // Correção: Para input type="number", o valor já vem com ponto decimal padrão.
    const numericAmount = parseFloat(amount) || 0;
    const sourceEst = establishments.find(e => e.id === sourceId);
    const targetEst = establishments.find(e => e.id === targetId);

    if (!sourceEst || !targetEst) return;

    const commonId = crypto.randomUUID(); // Link lógico (opcional, mas bom para rastreio)

    // 1. Transação de Saída (Origem)
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

    // 2. Transação de Entrada (Destino)
    const transactionIn: Transaction = {
      id: crypto.randomUUID(),
      date,
      timestamp: new Date().toISOString(), // Mesmo timestamp aproximado
      establishmentId: targetId,
      type: TransactionType.ENTRADA,
      amount: numericAmount,
      description: `Recebido de ${sourceEst.name}`,
      observations: `Ref: ${observation}`,
      status: TransactionStatus.APROVADO,
      user: userEmail
    };

    // Salva ambas
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
                <label className="block text-xs font-bold text-rose-500 uppercase mb-1">Sai de (Origem)</label>
                <select 
                    value={sourceId} 
                    onChange={(e) => {
                      setSourceId(e.target.value);
                      // Se selecionar a mesma que o alvo, tenta mudar o alvo
                      if (e.target.value === targetId) {
                         const other = establishments.find(est => est.id !== e.target.value);
                         if (other) setTargetId(other.id);
                      }
                    }} 
                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                    {establishments.map(est => (
                        <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                <svg className="w-6 h-6 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </div>

            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Entra em (Destino)</label>
                <select 
                    value={targetId} 
                    onChange={(e) => setTargetId(e.target.value)} 
                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                    {establishments.map(est => (
                        <option key={est.id} value={est.id} disabled={est.id === sourceId}>{est.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="space-y-6">
            <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor a Transferir (R$)</label>
            <input 
              type="number" 
              step="0.01" 
              inputMode="decimal"
              required 
              min="0.01" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full text-3xl font-bold p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-300" 
              placeholder="0.00" 
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Transferência</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo / Observação</label>
                    <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="Ex: Empréstimo para cobrir caixa" />
                </div>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button type="submit" disabled={isSubmitting || !amount} className={`w-full py-4 px-4 text-white rounded-xl font-bold text-lg transition-colors shadow-lg flex items-center justify-center gap-2 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {isSubmitting ? 'Processando...' : 'Confirmar Transferência'}
                {!isSubmitting && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
                Esta ação criará automaticamente um lançamento de saída na origem e um de entrada no destino.
            </p>
        </div>
      </form>
    </div>
  );
};
