
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
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isConvidado = userRole === 'Convidado';

  useEffect(() => {
    setLocalNote(notes[noteScope] || "");
  }, [notes, noteScope]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) setActiveDropdown(null);
    };
    if (activeDropdown) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    if (establishments.length > 0) {
      const validLeftIds = leftFilterIds.filter(id => establishments.some(e => e.id === id));
      const validRightIds = rightFilterIds.filter(id => establishments.some(e => e.id === id));
      if (validLeftIds.length === 0 && validRightIds.length === 0) setLeftFilterIds(establishments.map(e => e.id));
      else { setLeftFilterIds(validLeftIds); setRightFilterIds(validRightIds); }
    }
  }, [establishments]);

  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const toggleId = (id: string, currentIds: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    setIds(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
  };

  const selectAll = (setIds: React.Dispatch<React.SetStateAction<string[]>>) => setIds(establishments.map(e => e.id));
  const clearAll = (setIds: React.Dispatch<React.SetStateAction<string[]>>) => setIds([]);

  const calculateGroupBalance = (filterIds: string[]) => {
    if (filterIds.length === 0) return 0;
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => {
        const typeNormalized = String(t.type).trim().toLowerCase();
        const amount = Number(t.amount) || 0;
        return (typeNormalized === 'entrada') ? acc + amount : (typeNormalized === 'saída' || typeNormalized === 'saida') ? acc - amount : acc;
      }, 0);
  };

  const leftBalance = useMemo(() => calculateGroupBalance(leftFilterIds), [transactions, leftFilterIds]);
  const rightBalance = useMemo(() => calculateGroupBalance(rightFilterIds), [transactions, rightFilterIds]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t => t.date === date);
      const entrada = dayTransactions.filter(t => t.type === TransactionType.ENTRADA).reduce((sum, t) => sum + t.amount, 0);
      const saida = dayTransactions.filter(t => t.type === TransactionType.SAIDA).reduce((sum, t) => sum + t.amount, 0);
      return { name: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Entrada: entrada, Saída: saida };
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

  const saveNote = async () => {
    if (onSaveNote && !isConvidado) {
      setIsSavingNote(true);
      await onSaveNote(localNote, noteScope);
      setIsSavingNote(false);
    }
    setIsEditingNote(false);
  };

  const renderDropdownFilter = (currentIds: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>, dropdownKey: 'left' | 'right') => {
    const isOpen = activeDropdown === dropdownKey;
    let labelText = currentIds.length === establishments.length ? 'Todas as Unidades' : (currentIds.length === 1 ? establishments.find(e => e.id === currentIds[0])?.name : `${currentIds.length} Selecionadas`);

    return (
      <div className="relative mb-3 dropdown-container" onClick={(e) => e.stopPropagation()}>
         <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">{dropdownKey === 'left' ? 'Comparação A' : 'Comparação B'}</label>
         <button onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)} className={`w-full bg-white dark:bg-slate-800 border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{labelText}</span>
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </button>
         {isOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] max-h-72 overflow-y-auto">
                <div onClick={() => currentIds.length === establishments.length ? clearAll(setIds) : selectAll(setIds)} className="p-3 border-b dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer sticky top-0 bg-white dark:bg-slate-800">
                     <div className={`w-4 h-4 rounded border ${currentIds.length === establishments.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div>
                     <span className="text-xs font-bold">Selecionar Todos</span>
                </div>
                {establishments.map(est => (
                    <div key={est.id} onClick={() => toggleId(est.id, currentIds, setIds)} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 dark:border-slate-700/30">
                        <div className={`w-4 h-4 rounded border ${currentIds.includes(est.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{est.name}</span>
                    </div>
                ))}
             </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col relative z-[60]">
          {renderDropdownFilter(leftFilterIds, setLeftFilterIds, 'left')}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg flex-1">
                <h2 className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo A</h2>
                <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(leftBalance)}</div>
          </div>
        </div>
        <div className="flex flex-col relative z-[50]">
          {renderDropdownFilter(rightFilterIds, setRightFilterIds, 'right')}
          <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg flex-1">
                <h2 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo B</h2>
                <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(rightBalance)}</div>
          </div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Mural de Anotações</h3>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                 <button onClick={() => { setNoteScope("GENERAL"); setIsEditingNote(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${noteScope === "GENERAL" ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Geral</button>
                 {establishments.slice(0, 2).map(est => (
                   <button key={est.id} onClick={() => { setNoteScope(est.id); setIsEditingNote(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${noteScope === est.id ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-500'}`}>{est.name.split(' ')[0]}</button>
                 ))}
              </div>
            </div>
            <div className="relative group">
              {isEditingNote && !isConvidado ? (
                <div className="space-y-3">
                  <textarea autoFocus value={localNote} onChange={(e) => setLocalNote(e.target.value)} className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-sm outline-none resize-none font-medium" />
                  <div className="flex gap-2 justify-end">
                     <button onClick={() => setIsEditingNote(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Descartar</button>
                     <button onClick={saveNote} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">Salvar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => !isConvidado && setIsEditingNote(true)} className={`p-5 bg-amber-50/30 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl min-h-[100px] flex flex-col ${isConvidado ? 'cursor-default' : 'cursor-text hover:bg-amber-50/50'}`}>
                  <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap">{localNote || (isConvidado ? "Nenhuma anotação disponível." : "Toque para escrever uma anotação...") }</div>
                </div>
              )}
            </div>
        </div>
      )}

      {settings.showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg> Assistente IA</h3>
            <form onSubmit={handleAskAI} className="relative">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Qual o resumo do mês?' className="w-full p-4 pr-32 rounded-2xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                <button type="submit" disabled={loadingAi || !question.trim()} className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-5 rounded-xl text-xs font-bold disabled:opacity-50 min-w-[90px]">{loadingAi ? '...' : 'Analisar'}</button>
            </form>
            {aiResponse && <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl text-xs leading-relaxed">{aiResponse.answer}</div>}
        </div>
      )}

      {settings.showChart && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <h3 className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest mb-4">Consolidado 7 Dias</h3>
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
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v: number) => CURRENCY_FORMATTER.format(v)} />
                <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="url(#colorEntrada)" strokeWidth={2} />
                <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="url(#colorSaida)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {establishments.map(est => {
          const balance = transactions.filter(t => t.establishmentId === est.id).reduce((acc, t) => t.type === TransactionType.ENTRADA ? acc + t.amount : acc - t.amount, 0);
          return (
            <button key={est.id} onClick={() => navigate(`/establishment/${est.id}`)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-left group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{est.name}</h4>
                <div className={`p-1.5 rounded-full ${balance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {balance >= 0 ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"></path><path d="M17 18h6v-6"></path></svg>
                  )}
                </div>
              </div>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{CURRENCY_FORMATTER.format(balance)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
