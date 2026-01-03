
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Establishment, Transaction, TransactionType, AppSettings } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface DashboardProps {
  establishments: Establishment[];
  transactions: Transaction[];
  notes?: Record<string, string>;
  onSaveNote?: (note: string, entityId: string) => void;
  settings: AppSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ establishments, transactions, notes = {}, onSaveNote, settings }) => {
  const navigate = useNavigate();
  const [leftFilterIds, setLeftFilterIds] = useState<string[]>([]);
  const [rightFilterIds, setRightFilterIds] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'left' | 'right' | null>(null);
  const [noteScope, setNoteScope] = useState<string>("GENERAL");
  const [localNote, setLocalNote] = useState(notes["GENERAL"] || "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    setLocalNote(notes[noteScope] || "");
  }, [notes, noteScope]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    if (establishments.length > 0) {
      const validLeftIds = leftFilterIds.filter(id => establishments.some(e => e.id === id));
      const validRightIds = rightFilterIds.filter(id => establishments.some(e => e.id === id));
      if (validLeftIds.length === 0 && validRightIds.length === 0) {
        setLeftFilterIds(establishments.map(e => e.id));
      } else {
        setLeftFilterIds(validLeftIds);
        setRightFilterIds(validRightIds);
      }
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
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t => t.date === date);
      const entrada = dayTransactions
        .filter(t => String(t.type).trim().toLowerCase() === 'entrada')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const saida = dayTransactions
        .filter(t => {
           const type = String(t.type).trim().toLowerCase();
           return type === 'saída' || type === 'saida';
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const labelDate = new Date(date + 'T12:00:00');
      return {
        name: labelDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        Entrada: entrada,
        Saída: saida
      };
    });
  }, [transactions]);

  const getEstablishmentBalance = (id: string) => {
    return transactions
      .filter(t => String(t.establishmentId) === id)
      .reduce((acc, t) => {
        const type = String(t.type).trim().toLowerCase();
        const val = Number(t.amount) || 0;
        return (type === 'entrada') ? acc + val : acc - val;
      }, 0);
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoadingAi(true);
    setAiResponse(null);
    const result = await askFinancialAssistant("Toda a Rede", transactions, establishments, question);
    setAiResponse(result);
    setLoadingAi(false);
  };

  const openSuggestedTransaction = (sug: NonNullable<AiAssistantResponse['suggestedTransaction']>) => {
    const params = new URLSearchParams();
    if (sug.amount) params.set('amount', sug.amount.toString());
    if (sug.description) params.set('description', sug.description);
    if (sug.type) params.set('type', sug.type);
    if (sug.establishmentId) params.set('establishmentId', sug.establishmentId);
    navigate(`/new?${params.toString()}`);
  };

  const saveNote = async () => {
    if (onSaveNote) {
      setIsSavingNote(true);
      await onSaveNote(localNote, noteScope);
      setIsSavingNote(false);
    }
    setIsEditingNote(false);
  };

  const renderDropdownFilter = (currentIds: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>, dropdownKey: 'left' | 'right') => {
    const isOpen = activeDropdown === dropdownKey;
    let labelText = 'Selecione...';
    if (currentIds.length === 0) labelText = 'Nenhum selecionado';
    else if (currentIds.length === establishments.length) labelText = 'Todos os Estabelecimentos';
    else if (currentIds.length === 1) labelText = establishments.find(e => e.id === currentIds[0])?.name || '1 Selecionado';
    else labelText = `${currentIds.length} selecionados`;

    return (
      <div className="relative mb-3 dropdown-container" onClick={(e) => e.stopPropagation()}>
         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
            {dropdownKey === 'left' ? 'Comparação A' : 'Comparação B'}
         </label>
         <button onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)} className={`w-full bg-white dark:bg-slate-800 border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2">{labelText}</span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </button>
         {isOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] max-h-72 overflow-y-auto animate-fade-in scrollbar-thin">
                <div onClick={() => currentIds.length === establishments.length ? clearAll(setIds) : selectAll(setIds)} className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors sticky top-0 bg-white dark:bg-slate-800 z-10">
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${currentIds.length === establishments.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {currentIds.length === establishments.length && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                     </div>
                     <span className="text-sm font-bold text-slate-800 dark:text-white">Selecionar Todos</span>
                </div>
                {establishments.map(est => {
                    const isSelected = currentIds.includes(est.id);
                    return (
                        <div key={est.id} onClick={() => toggleId(est.id, currentIds, setIds)} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/30 last:border-0">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{est.name}</span>
                        </div>
                    );
                })}
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
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg flex-1 relative">
             <div className="relative z-10">
                <h2 className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white"></div>
                   Grupo A ({leftFilterIds.length})
                </h2>
                <div className="text-3xl font-bold mt-2">{CURRENCY_FORMATTER.format(leftBalance)}</div>
             </div>
          </div>
        </div>
        <div className="flex flex-col relative z-[50]">
          {renderDropdownFilter(rightFilterIds, setRightFilterIds, 'right')}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 dark:from-orange-900 dark:to-amber-900 rounded-2xl p-6 text-white shadow-lg flex-1 relative">
             <div className="relative z-10">
                <h2 className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white"></div>
                   Grupo B ({rightFilterIds.length})
                </h2>
                <div className="text-3xl font-bold mt-2">{CURRENCY_FORMATTER.format(rightBalance)}</div>
             </div>
          </div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 p-3">
               {isSavingNote && <div className="text-[10px] font-bold text-indigo-500 animate-pulse uppercase tracking-widest">Salvando...</div>}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Mural de Anotações</h3>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
                 <button onClick={() => { setNoteScope("GENERAL"); setIsEditingNote(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${noteScope === "GENERAL" ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>Geral</button>
                 {establishments.slice(0, 3).map(est => (
                   <button key={est.id} onClick={() => { setNoteScope(est.id); setIsEditingNote(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${noteScope === est.id ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{est.name.split(' ')[0]}</button>
                 ))}
              </div>
            </div>
            <div className="relative group min-h-[120px]">
              {isEditingNote ? (
                <div className="space-y-3 animate-fade-in">
                  <textarea autoFocus value={localNote} onChange={(e) => setLocalNote(e.target.value)} className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none font-medium" />
                  <div className="flex gap-2 justify-end">
                     <button onClick={() => { setLocalNote(notes[noteScope] || ""); setIsEditingNote(false); }} className="px-4 py-2 text-xs font-bold text-slate-500">Descartar</button>
                     <button onClick={saveNote} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">Salvar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setIsEditingNote(true)} className="p-5 bg-amber-50/30 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl cursor-text min-h-[120px] flex flex-col">
                  <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap">{localNote || "Toque para escrever uma anotação..."}</div>
                </div>
              )}
            </div>
        </div>
      )}

      {settings.showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in transition-colors">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Assistente IA</h3>
            </div>
            <form onSubmit={handleAskAI} className="relative group">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder='Ex: "Qual foi o gasto total com limpeza na Villa Montese?"' className="w-full p-4 pr-32 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-all" />
                <button type="submit" disabled={loadingAi || !question.trim()} className="absolute right-2 top-2 bottom-2 bg-[#3f45a1] dark:bg-[#4f55c1] text-white px-5 rounded-xl text-xs font-bold disabled:opacity-50 min-w-[90px]">
                    {loadingAi ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Analisar'}
                </button>
            </form>
            {aiResponse && (
              <div className="mt-5 space-y-3 animate-fade-in">
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-2 uppercase text-[10px] tracking-widest">Insights da IA</span>
                  {aiResponse.answer}
                </div>
              </div>
            )}
        </div>
      )}

      {settings.showChart && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors animate-fade-in">
          <div className="flex justify-between items-center mb-4">
               <h3 className="text-slate-700 dark:text-slate-300 font-semibold">Tendência Consolidada (7 Dias)</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#fff' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), '']} />
                <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="url(#colorEntrada)" strokeWidth={3} />
                <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="url(#colorSaida)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {establishments.map(est => {
          const balance = getEstablishmentBalance(est.id);
          const isPositive = balance >= 0;
          return (
            <button key={est.id} onClick={() => navigate(`/establishment/${est.id}`)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-left group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{est.name}</h4>
                <div className={`p-1.5 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {isPositive ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>}
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{CURRENCY_FORMATTER.format(balance)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
