
import React, { useMemo, useState, useEffect, useRef } from 'react';
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

const GroupSelector: React.FC<{
  label: string;
  establishments: Establishment[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ label, establishments, selectedIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
      >
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Selecionar {label}</span>
        <div className="flex items-center gap-1 bg-indigo-500 text-white text-[9px] px-1.5 rounded-md font-bold">
           {selectedIds.length}
        </div>
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[60] py-2 animate-fade-in">
           <div className="max-h-60 overflow-y-auto px-1">
             {establishments.map(est => (
               <button 
                key={est.id}
                onClick={() => toggle(est.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
               >
                 <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase truncate pr-4">{est.name}</span>
                 <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(est.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 dark:border-slate-600'}`}>
                   {selectedIds.includes(est.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                 </div>
               </button>
             ))}
           </div>
           {establishments.length > 0 && (
             <div className="px-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                <button onClick={() => onChange(establishments.map(e => e.id))} className="flex-1 py-1.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">Todos</button>
                <button onClick={() => onChange([])} className="flex-1 py-1.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">Nenhum</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ establishments, transactions, notes = {}, onSaveNote, settings, userRole }) => {
  const navigate = useNavigate();
  
  // Seleção dinâmica dos grupos via LocalStorage
  const [selectedGroupA, setSelectedGroupA] = useState<string[]>(() => {
    const saved = localStorage.getItem('gsc_group_a');
    return saved ? JSON.parse(saved) : (establishments.length > 0 ? [establishments[0].id] : []);
  });

  const [selectedGroupB, setSelectedGroupB] = useState<string[]>(() => {
    const saved = localStorage.getItem('gsc_group_b');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('gsc_group_a', JSON.stringify(selectedGroupA));
  }, [selectedGroupA]);

  useEffect(() => {
    localStorage.setItem('gsc_group_b', JSON.stringify(selectedGroupB));
  }, [selectedGroupB]);

  const [noteScope, setNoteScope] = useState<string>("GENERAL");
  const [localNote, setLocalNote] = useState(notes["GENERAL"] || "");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const isConvidado = userRole === 'Convidado';

  useEffect(() => {
    setLocalNote(notes[noteScope] || "");
  }, [notes, noteScope]);

  const calculateGroupBalance = (filterIds: string[]) => {
    if (!filterIds || filterIds.length === 0) return 0;
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => {
        const amount = Number(t.amount) || 0;
        return (t.type === TransactionType.ENTRADA) ? acc + amount : acc - amount;
      }, 0);
  };

  const leftBalance = useMemo(() => calculateGroupBalance(selectedGroupA), [transactions, selectedGroupA]);
  const rightBalance = useMemo(() => calculateGroupBalance(selectedGroupB), [transactions, selectedGroupB]);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => t.date === isoDate);
      const entrada = dayTransactions.filter(t => t.type === TransactionType.ENTRADA).reduce((sum, t) => sum + t.amount, 0);
      const saida = dayTransactions.filter(t => t.type === TransactionType.SAIDA).reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        name: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        Entrada: entrada,
        Saída: saida
      });
    }
    return data;
  }, [transactions]);

  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

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
        <div className="space-y-2">
          <div className="flex justify-between items-center px-2">
            <GroupSelector label="Grupo A" establishments={establishments} selectedIds={selectedGroupA} onChange={setSelectedGroupA} />
          </div>
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl min-h-[140px] flex flex-col justify-center transition-all">
            <h2 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Grupo A</h2>
            <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(leftBalance)}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center px-2">
            <GroupSelector label="Grupo B" establishments={establishments} selectedIds={selectedGroupB} onChange={setSelectedGroupB} />
          </div>
          <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-xl min-h-[140px] flex flex-col justify-center transition-all">
            <h2 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo B</h2>
            <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(rightBalance)}</div>
          </div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 text-xs uppercase tracking-[0.2em]">
               <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Mural de Anotações
            </h3>
            <div onClick={() => !isConvidado && setIsEditingNote(true)} className="p-5 bg-amber-50/20 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-2xl cursor-text hover:bg-amber-50/40 transition-all">
               {isEditingNote ? (
                 <textarea autoFocus value={localNote} onChange={e => setLocalNote(e.target.value)} onBlur={saveNote} className="w-full h-24 bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-300 resize-none" />
               ) : (
                 <p className="text-sm text-slate-600 dark:text-slate-400 min-h-[60px] italic whitespace-pre-wrap">{localNote || "Toque para adicionar um lembrete..."}</p>
               )}
            </div>
        </div>
      )}

      {settings.showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg> Assistente IA</h3>
            <form onSubmit={handleAskAI} className="relative">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Qual a situação da rede hoje?' className="w-full p-4 pr-32 rounded-2xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                <button type="submit" disabled={loadingAi || !question.trim()} className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-5 rounded-xl text-xs font-bold">{loadingAi ? '...' : 'Analisar'}</button>
            </form>
            {aiResponse && <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl text-[11px] leading-relaxed font-medium">{aiResponse.answer}</div>}
        </div>
      )}

      {settings.showChart && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-8">Fluxo dos Últimos 7 Dias</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px' }} 
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 'black' }}
                  formatter={(v: number) => CURRENCY_FORMATTER.format(v)} 
                />
                <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="url(#colorEntrada)" strokeWidth={4} />
                <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="url(#colorSaida)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {establishments.map(est => {
          const balance = transactions.filter(t => t.establishmentId === est.id).reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
          return (
            <button key={est.id} onClick={() => navigate(`/establishment/${est.id}`)} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-left flex justify-between items-center group">
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{est.name}</h4>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">{CURRENCY_FORMATTER.format(balance)}</div>
              </div>
              <div className={`p-4 rounded-2xl transition-all group-hover:rotate-6 ${balance >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                {balance >= 0 ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"></path><path d="M17 18h6v-6"></path></svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
