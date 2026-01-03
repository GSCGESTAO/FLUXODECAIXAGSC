
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Establishment, Transaction, TransactionType, AppSettings, UserRole } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface DashboardProps {
  establishments: Establishment[];
  transactions: Transaction[];
  notes?: Record<string, string>;
  onSaveNote?: (note: string, entityId: string) => void;
  settings: AppSettings;
  userRole?: UserRole | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ establishments, transactions, notes = {}, onSaveNote, settings, userRole }) => {
  const navigate = useNavigate();
  const [leftFilterIds, setLeftFilterIds] = useState<string[]>([]);
  const [rightFilterIds, setRightFilterIds] = useState<string[]>([]);
  const [noteScope, setNoteScope] = useState<string>("GENERAL");
  const [localNote, setLocalNote] = useState(notes["GENERAL"] || "");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const isConvidado = userRole === 'Convidado';

  useEffect(() => {
    setLocalNote(notes[noteScope] || "");
  }, [notes, noteScope]);

  useEffect(() => {
    if (establishments.length > 0 && leftFilterIds.length === 0) {
      setLeftFilterIds(establishments.map(e => e.id));
    }
  }, [establishments, leftFilterIds.length]);

  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const calculateGroupBalance = (filterIds: string[]) => {
    if (filterIds.length === 0) return 0;
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  };

  const leftBalance = useMemo(() => calculateGroupBalance(leftFilterIds), [transactions, leftFilterIds]);
  const rightBalance = useMemo(() => calculateGroupBalance(rightFilterIds), [transactions, rightFilterIds]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoadingAi(true);
    setAiResponse(null);
    const result = await askFinancialAssistant("Toda a Rede", transactions, establishments, question);
    setAiResponse(result);
    setLoadingAi(false);
  };

  const saveNote = () => {
    if (onSaveNote && !isConvidado) onSaveNote(localNote, noteScope);
    setIsEditingNote(false);
  };

  const TrendUpIcon = () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M23 6l-9.5 9.5-5-5L1 18"></path>
      <path d="M17 6h6v6"></path>
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M23 18l-9.5-9.5-5 5L1 6"></path>
      <path d="M17 18h6v-6"></path>
    </svg>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Entradas Consolidadas</h2>
          <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(leftBalance)}</div>
        </div>
        <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-1">Saídas Consolidadas</h2>
          <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(rightBalance)}</div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
               <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Mural de Avisos
            </h3>
            <div onClick={() => !isConvidado && setIsEditingNote(true)} className="p-4 bg-amber-50/30 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl cursor-text">
               {isEditingNote ? (
                 <textarea autoFocus value={localNote} onChange={e => setLocalNote(e.target.value)} onBlur={saveNote} className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium" />
               ) : (
                 <p className="text-sm text-slate-600 dark:text-slate-400 min-h-[60px] italic">{localNote || "Toque para adicionar uma nota..."}</p>
               )}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {establishments.map(est => {
          const balance = transactions.filter(t => t.establishmentId === est.id).reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
          return (
            <button key={est.id} onClick={() => navigate(`/establishment/${est.id}`)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-left flex justify-between items-center group">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{est.name}</h4>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">{CURRENCY_FORMATTER.format(balance)}</div>
              </div>
              <div className={`p-2.5 rounded-full transition-all ${balance >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20'}`}>
                {balance >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
