
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Establishment, Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { askFinancialAssistant, AiAssistantResponse } from '../services/geminiService';

interface DashboardProps {
  establishments: Establishment[];
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ establishments, transactions }) => {
  const navigate = useNavigate();
  
  // States for dynamic filtering
  const [leftFilterIds, setLeftFilterIds] = useState<string[]>([]);
  const [rightFilterIds, setRightFilterIds] = useState<string[]>([]);
  
  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<'left' | 'right' | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // Sincroniza os filtros quando os estabelecimentos mudam (especialmente após o sync da planilha)
  useEffect(() => {
    if (establishments.length > 0) {
      // Se os filtros estiverem vazios ou contiverem IDs que não existem mais (ex: IDs de Mock), resetamos
      const validLeftIds = leftFilterIds.filter(id => establishments.some(e => e.id === id));
      const validRightIds = rightFilterIds.filter(id => establishments.some(e => e.id === id));

      // Se após a validação o Grupo A estiver vazio, mas temos estabelecimentos, preenchemos com todos
      if (validLeftIds.length === 0 && validRightIds.length === 0) {
        setLeftFilterIds(establishments.map(e => e.id));
      } else {
        setLeftFilterIds(validLeftIds);
        setRightFilterIds(validRightIds);
      }
    }
  }, [establishments]);

  // AI Query State
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const toggleId = (id: string, currentIds: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    setIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(eid => eid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAll = (setIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    setIds(establishments.map(e => e.id));
  };
  
  const clearAll = (setIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    setIds([]);
  };

  /**
   * Cálculo Robusto:
   * 1. Garante que o ID do estabelecimento seja tratado como string.
   * 2. Trata o valor como número.
   * 3. Trata o tipo de forma insensível a maiúsculas e acentos (Saída vs Saida).
   */
  const calculateGroupBalance = (filterIds: string[]) => {
    if (filterIds.length === 0) return 0;
    
    return transactions
      .filter(t => filterIds.includes(String(t.establishmentId)))
      .reduce((acc, t) => {
        const typeNormalized = String(t.type).trim().toLowerCase();
        const amount = Number(t.amount) || 0;
        
        // Comparações flexíveis para dados vindo de planilhas manuais
        if (typeNormalized === 'entrada') {
          return acc + amount;
        } else if (typeNormalized === 'saída' || typeNormalized === 'saida') {
          return acc - amount;
        }
        return acc;
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
      const entrada = dayTransactions
        .filter(t => String(t.type).trim().toLowerCase() === 'entrada')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const saida = dayTransactions
        .filter(t => {
           const type = String(t.type).trim().toLowerCase();
           return type === 'saída' || type === 'saida';
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      return {
        name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
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

  const renderDropdownFilter = (
    currentIds: string[], 
    setIds: React.Dispatch<React.SetStateAction<string[]>>, 
    dropdownKey: 'left' | 'right'
  ) => {
    const isOpen = activeDropdown === dropdownKey;
    
    let labelText = 'Selecione...';
    if (currentIds.length === 0) labelText = 'Nenhum selecionado';
    else if (currentIds.length === establishments.length) labelText = 'Todos os Estabelecimentos';
    else if (currentIds.length === 1) labelText = establishments.find(e => e.id === currentIds[0])?.name || '1 Selecionado';
    else labelText = `${currentIds.length} selecionados`;

    return (
      <div className="relative mb-3" onClick={(e) => e.stopPropagation()}>
         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
            {dropdownKey === 'left' ? 'Comparação A' : 'Comparação B'}
         </label>
         <button
            onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
            className={`w-full bg-white dark:bg-slate-800 border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
         >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2">{labelText}</span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </button>

         {isOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 max-h-64 overflow-y-auto animate-fade-in scrollbar-hide">
                <div 
                    onClick={() => currentIds.length === establishments.length ? clearAll(setIds) : selectAll(setIds)}
                    className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors sticky top-0 bg-white dark:bg-slate-800 z-10"
                >
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${currentIds.length === establishments.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {currentIds.length === establishments.length && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                     </div>
                     <span className="text-sm font-bold text-slate-800 dark:text-white">Selecionar Todos</span>
                </div>
                
                {establishments.map(est => {
                    const isSelected = currentIds.includes(est.id);
                    return (
                        <div 
                            key={est.id}
                            onClick={() => toggleId(est.id, currentIds, setIds)}
                            className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/30 last:border-0"
                        >
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
        <div className="flex flex-col relative z-20">
          {renderDropdownFilter(leftFilterIds, setLeftFilterIds, 'left')}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg transition-all duration-300 flex-1 relative overflow-hidden">
             <div className="relative z-10">
                <h2 className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white"></div>
                   Grupo A ({leftFilterIds.length})
                </h2>
                <div className="text-3xl font-bold mt-2">{CURRENCY_FORMATTER.format(leftBalance)}</div>
                <div className="mt-4 text-xs opacity-80">
                  Total consolidado da seleção A
                </div>
             </div>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
          </div>
        </div>

        <div className="flex flex-col relative z-10">
          {renderDropdownFilter(rightFilterIds, setRightFilterIds, 'right')}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 dark:from-orange-900 dark:to-amber-900 rounded-2xl p-6 text-white shadow-lg transition-all duration-300 flex-1 relative overflow-hidden">
             <div className="relative z-10">
                <h2 className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white"></div>
                   Grupo B ({rightFilterIds.length})
                </h2>
                <div className="text-3xl font-bold mt-2">{CURRENCY_FORMATTER.format(rightBalance)}</div>
                <div className="mt-4 text-xs opacity-80">
                  Total consolidado da seleção B
                </div>
             </div>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
           <svg className="w-24 h-24 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Assistente Financeiro IA</h3>
            </div>
            
            <form onSubmit={handleAskAI} className="relative">
                <input 
                    type="text" 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder='Ex: "Lançar 50 reais de limpeza para Villa Montese"'
                    className="w-full p-3 pr-24 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm transition-colors"
                />
                <button 
                    type="submit"
                    disabled={loadingAi || !question.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 text-white px-3 rounded-md text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {loadingAi ? '...' : 'Analisar'}
                </button>
            </form>

            {aiResponse && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed shadow-inner">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      Resposta IA:
                  </span>
                  {aiResponse.answer}
                </div>

                {aiResponse.suggestedTransaction && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-emerald-900/10 dark:to-indigo-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Ação Sugerida</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {aiResponse.suggestedTransaction.type}: {aiResponse.suggestedTransaction.description} ({CURRENCY_FORMATTER.format(aiResponse.suggestedTransaction.amount)})
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => openSuggestedTransaction(aiResponse.suggestedTransaction!)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md hover:scale-105"
                    >
                      Abrir Lançamento
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-slate-700 dark:text-slate-300 font-semibold">Tendência Consolidada (7 Dias)</h3>
             <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">Toda a Rede</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#1e293b' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value: number) => [CURRENCY_FORMATTER.format(value), '']}
              />
              <Area type="monotone" dataKey="Entrada" stroke="#10b981" fillOpacity={1} fill="url(#colorEntrada)" strokeWidth={2} />
              <Area type="monotone" dataKey="Saída" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSaida)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-3">Detalhes por Estabelecimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {establishments.map(est => {
            const balance = getEstablishmentBalance(est.id);
            const isPositive = balance >= 0;
            return (
              <button 
                key={est.id}
                onClick={() => navigate(`/establishment/${est.id}`)}
                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-left group animate-fade-in"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{est.name}</h4>
                  <div className={`p-1.5 rounded-full ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                    {isPositive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                  {CURRENCY_FORMATTER.format(balance)}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Toque para ver detalhes
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
