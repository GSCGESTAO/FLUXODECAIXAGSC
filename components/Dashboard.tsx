
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
  const [activeDropdown, setActiveDropdown] = useState<'left' | 'right' | null>(null);
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
  }, [establishments, leftFilterIds]);

  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const calculateGroupBalance = (filterIds: string[]) => {
    if (filterIds.length === 0) return 0;
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => (t.type === TransactionType.ENTRADA) ? acc + t.amount : acc - t.amount, 0);
  };

  const leftBalance = useMemo(() => calculateGroupBalance(leftFilterIds), [transactions, leftFilterIds]);
  const rightBalance = useMemo(() => calculateGroupBalance(rightFilterIds), [transactions, rightFilterIds]);

  const chartData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return dates.map(isoDate => {
      const dayTransactions = transactions.filter(t => t.date === isoDate);
      const entrada = dayTransactions.filter(t => t.type === TransactionType.ENTRADA).reduce((sum, t) => sum + t.amount, 0);
      const saida = dayTransactions.filter(t => t.type === TransactionType.SAIDA).reduce((sum, t) => sum + t.amount, 0);
      
      const labelDate = new Date(isoDate + 'T12:00:00');
      return { 
        name: labelDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
        Entrada: entrada, 
        Saída: saida 
      };
    });
  }, [transactions]);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col relative z-20">
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo A</h2>
                <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(leftBalance)}</div>
          </div>
        </div>
        <div className="flex flex-col relative z-10">
          <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo B</h2>
                <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(rightBalance)}</div>
          </div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
               <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Mural de Anotações
            </h3>
            <div onClick={() => !isConvidado && setIsEditingNote(true)} className="p-5 bg-amber-50/30 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl cursor-text transition-colors hover:bg-amber-50/50">
               {isEditingNote ? (
                 <textarea autoFocus value={localNote} onChange={e => setLocalNote(e.target.value)} onBlur={saveNote} className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium" />
               ) : (
                 <p className="text-sm text-slate-600 dark:text-slate-400 min-h-[60px] italic whitespace-pre-wrap">{localNote || "Toque para adicionar uma nota..."}</p>
               )}
            </div>
        </div>
      )}

      {settings.showChart && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-6">Tendência Semanal (7 dias)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v: number) => CURRENCY_FORMATTER.format(v)} />
                <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="url(#colorEntrada)" strokeWidth={3} />
                <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="url(#colorSaida)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
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
              <div className={`p-2.5 rounded-full ${balance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {balance >= 0 ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"></path><path d="M17 18h6v-6"></path></svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
