
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
  }, [establishments, leftFilterIds]);

  const calculateGroupBalance = (filterIds: string[]) => {
    if (filterIds.length === 0) return 0;
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => (t.type === TransactionType.ENTRADA) ? acc + t.amount : acc - t.amount, 0);
  };

  const leftBalance = useMemo(() => calculateGroupBalance(leftFilterIds), [transactions, leftFilterIds]);
  const rightBalance = useMemo(() => calculateGroupBalance(rightFilterIds), [transactions, rightFilterIds]);

  /**
   * Lógica do Gráfico de 7 Dias
   * Gera chaves de busca baseadas no tempo LOCAL do navegador no formato YYYY-MM-DD
   */
  const chartData = useMemo(() => {
    const today = new Date();
    
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      // en-CA gera YYYY-MM-DD de forma limpa e local
      return d.toLocaleDateString('en-CA');
    });

    return dates.map(isoKey => {
      // Busca transações que batem com a string exata YYYY-MM-DD
      const dayTransactions = transactions.filter(t => t.date === isoKey);
      
      const entrada = dayTransactions
        .filter(t => t.type === TransactionType.ENTRADA)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const saida = dayTransactions
        .filter(t => t.type === TransactionType.SAIDA)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Label para o gráfico (DD/MM)
      const parts = isoKey.split('-');
      return { 
        name: `${parts[2]}/${parts[1]}`, 
        Entrada: entrada, 
        Saída: saida,
        fullDate: `${parts[2]}/${parts[1]}/${parts[0]}`
      };
    });
  }, [transactions]);

  const saveNote = () => {
    if (onSaveNote && !isConvidado) onSaveNote(localNote, noteScope);
    setIsEditingNote(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl">
          <h2 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Grupo A</h2>
          <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(leftBalance)}</div>
        </div>
        <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-xl">
          <h2 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-1">Grupo B</h2>
          <div className="text-3xl font-black">{CURRENCY_FORMATTER.format(rightBalance)}</div>
        </div>
      </div>

      {settings.showNotes && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 text-xs uppercase tracking-[0.2em]">
               <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Mural de Avisos
            </h3>
            <div onClick={() => !isConvidado && setIsEditingNote(true)} className="p-5 bg-amber-50/20 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-2xl cursor-text hover:bg-amber-50/40 transition-all">
               {isEditingNote ? (
                 <textarea autoFocus value={localNote} onChange={e => setLocalNote(e.target.value)} onBlur={saveNote} className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium text-slate-700 dark:text-slate-300" />
               ) : (
                 <p className="text-sm text-slate-600 dark:text-slate-400 min-h-[60px] italic whitespace-pre-wrap">{localNote || "Adicione lembretes ou notas importantes aqui..."}</p>
               )}
            </div>
        </div>
      )}

      {settings.showChart && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-8">Fluxo Semanal (Últimos 7 dias)</h3>
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
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                  labelStyle={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 'black', textTransform: 'uppercase' }}
                  formatter={(v: number) => CURRENCY_FORMATTER.format(v)} 
                />
                <Area type="monotone" dataKey="Entrada" stroke="#10b981" fill="url(#colorEntrada)" strokeWidth={4} animationDuration={1000} />
                <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fill="url(#colorSaida)" strokeWidth={4} animationDuration={1000} />
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
