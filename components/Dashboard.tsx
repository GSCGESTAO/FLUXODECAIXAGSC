
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Establishment, Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface DashboardProps {
  establishments: Establishment[];
  transactions: Transaction[];
  notes: string;
  onSaveNote: (note: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ establishments, transactions, notes, onSaveNote }) => {
  const navigate = useNavigate();
  
  // States for dynamic filtering
  const [leftFilterIds, setLeftFilterIds] = useState<string[]>([]);
  const [rightFilterIds, setRightFilterIds] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'left' | 'right' | null>(null);
  
  // Notes State
  const [localNote, setLocalNote] = useState(notes);
  const [isNoteEditing, setIsNoteEditing] = useState(false);

  useEffect(() => setLocalNote(notes), [notes]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) setActiveDropdown(null);
    };
    if (activeDropdown) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // AI Query State
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const leftBalance = useMemo(() => {
    return transactions
      .filter(t => leftFilterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, leftFilterIds]);

  const rightBalance = useMemo(() => {
    return transactions
      .filter(t => rightFilterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, rightFilterIds]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });

    return days.map(date => {
      const dayTransactions = transactions.filter(t => t.date === date);
      return {
        name: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        Entrada: dayTransactions.filter(t => t.type === TransactionType.ENTRADA).reduce((s, t) => s + t.amount, 0),
        Saída: dayTransactions.filter(t => t.type === TransactionType.SAIDA).reduce((s, t) => s + t.amount, 0)
      };
    });
  }, [transactions]);

  const renderDropdownFilter = (currentIds: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>, key: 'left' | 'right') => {
    const isOpen = activeDropdown === key;
    const label = currentIds.length === 0 ? 'Nenhum' : currentIds.length === establishments.length ? 'Todos' : `${currentIds.length} Selecionados`;

    return (
      <div className="relative mb-3 dropdown-container">
         <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{key === 'left' ? 'Grupo A' : 'Grupo B'}</label>
         <button
            onClick={() => setActiveDropdown(isOpen ? null : key)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200"
         >
            <span className="truncate">{label}</span>
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
         </button>

         {isOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] max-h-60 overflow-y-auto animate-fade-in">
                <div onClick={() => setIds(currentIds.length === establishments.length ? [] : establishments.map(e => e.id))} className="p-3 border-b dark:border-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 uppercase">Selecionar Todos</div>
                {establishments.map(est => (
                  <div key={est.id} onClick={() => setIds(prev => prev.includes(est.id) ? prev.filter(i => i !== est.id) : [...prev, est.id])} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-0 dark:border-slate-700">
                    <div className={`w-4 h-4 rounded border ${currentIds.includes(est.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`} />
                    <span className="text-sm">{est.name}</span>
                  </div>
                ))}
             </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Comparativo de Saldos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative z-[60]">
          {renderDropdownFilter(leftFilterIds, setLeftFilterIds, 'left')}
          <div className="bg-indigo-600 dark:bg-indigo-900 rounded-2xl p-6 text-white shadow-lg h-32 flex flex-col justify-center">
            <div className="text-3xl font-bold">{CURRENCY_FORMATTER.format(leftBalance)}</div>
            <div className="text-[10px] uppercase font-bold opacity-70 mt-1">Saldo Consolidado A</div>
          </div>
        </div>
        <div className="relative z-[50]">
          {renderDropdownFilter(rightFilterIds, setRightFilterIds, 'right')}
          <div className="bg-amber-500 dark:bg-amber-900 rounded-2xl p-6 text-white shadow-lg h-32 flex flex-col justify-center">
            <div className="text-3xl font-bold">{CURRENCY_FORMATTER.format(rightBalance)}</div>
            <div className="text-[10px] uppercase font-bold opacity-70 mt-1">Saldo Consolidado B</div>
          </div>
        </div>
      </div>

      {/* Assistente IA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative transition-all">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg></div>
            <h3 className="font-bold text-slate-800 dark:text-white">Assistente de IA</h3>
        </div>
        
        <form onSubmit={async (e) => { e.preventDefault(); setLoadingAi(true); setAiResponse(await askFinancialAssistant("Rede", transactions, establishments, question)); setLoadingAi(false); }} className="relative bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-1.5 flex items-center group focus-within:ring-2 ring-indigo-500/20">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Lançar 50 reais de manutenção...' className="flex-1 bg-transparent p-3 outline-none text-sm dark:text-white placeholder:text-slate-400" />
            <button disabled={loadingAi || !question.trim()} className="bg-[#3b3f9a] dark:bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md active:scale-95 disabled:opacity-50 transition-all">
                {loadingAi ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Analisar'}
            </button>
        </form>

        {aiResponse && (
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm animate-fade-in border border-indigo-100 dark:border-indigo-800">
            {aiResponse.answer}
          </div>
        )}
      </div>

      {/* Mural de Anotações */}
      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/20 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg> Mural de Recados</h3>
            {isNoteEditing ? (
                <button onClick={() => { onSaveNote(localNote); setIsNoteEditing(false); }} className="text-xs font-bold bg-amber-600 text-white px-3 py-1 rounded-lg">Salvar</button>
            ) : (
                <button onClick={() => setIsNoteEditing(true)} className="text-xs font-bold text-amber-700 dark:text-amber-400">Editar</button>
            )}
        </div>
        {isNoteEditing ? (
            <textarea value={localNote} onChange={e => setLocalNote(e.target.value)} className="w-full h-24 bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200 outline-none text-sm" placeholder="Escreva lembretes aqui..." />
        ) : (
            <p className="text-sm text-amber-800 dark:text-amber-300 italic whitespace-pre-wrap">{localNote || "Sem anotações no momento."}</p>
        )}
      </div>

      {/* Gráfico de Tendência */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-slate-700 dark:text-slate-300 font-bold mb-4">Fluxo Consolidado (7 Dias)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => CURRENCY_FORMATTER.format(v)} contentStyle={{borderRadius: '12px', border: 'none', shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
              <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Cards de Unidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {establishments.map(est => {
            const bal = transactions.filter(t => t.establishmentId === est.id).reduce((s, t) => t.type === TransactionType.ENTRADA ? s + t.amount : s - t.amount, 0);
            return (
              <button key={est.id} onClick={() => navigate(`/establishment/${est.id}`)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-left group">
                <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{est.name}</h4>
                <div className={`text-2xl font-black mt-1 ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{CURRENCY_FORMATTER.format(bal)}</div>
              </button>
            );
        })}
      </div>
    </div>
  );
};
