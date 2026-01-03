import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Establishment, Transaction, TransactionType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ReportsProps {
  establishments: Establishment[];
  transactions: Transaction[];
}

export const Reports: React.FC<ReportsProps> = ({ establishments, transactions }) => {
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Multi-select State
  const [selectedEstIds, setSelectedEstIds] = useState<string[]>(establishments.map(e => e.id));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleEstId = (id: string) => {
    setSelectedEstIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllEsts = () => {
    if (selectedEstIds.length === establishments.length) {
      setSelectedEstIds([]);
    } else {
      setSelectedEstIds(establishments.map(e => e.id));
    }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date;
      const isDateInRange = tDate >= startDate && tDate <= endDate;
      const isEstMatch = selectedEstIds.includes(t.establishmentId);
      return isDateInRange && isEstMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate, selectedEstIds]);

  // Calculations
  const totalEntries = filteredData
    .filter(t => t.type === TransactionType.ENTRADA)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExits = filteredData
    .filter(t => t.type === TransactionType.SAIDA)
    .reduce((sum, t) => sum + t.amount, 0);

  const finalBalance = totalEntries - totalExits;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Define headers
    const headers = [
      "Data",
      "Estabelecimento",
      "Descrição",
      "Tipo",
      "Valor",
      "Usuário",
      "Status",
      "Observações"
    ];

    // Map data to rows
    const rows = filteredData.map(t => {
      const estName = establishments.find(e => e.id === t.establishmentId)?.name || 'N/A';
      // Escape quotes for CSV format
      const safeDesc = `"${t.description.replace(/"/g, '""')}"`;
      const safeObs = t.observations ? `"${t.observations.replace(/"/g, '""')}"` : '""';
      const formattedAmount = t.amount.toFixed(2).replace('.', ','); // Excel friendly format for BR

      return [
        new Date(t.date).toLocaleDateString('pt-BR'),
        `"${estName}"`,
        safeDesc,
        t.type,
        formattedAmount,
        t.user,
        t.status,
        safeObs
      ].join(';'); // Using semicolon for broader Excel compatibility in regions like Brazil
    });

    // Combine with BOM for UTF-8 support in Excel
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_fluxo_caixa_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filters (Hidden on Print) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:hidden transition-colors">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Gerar Relatório</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Início</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fim</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          
          {/* Custom Multi-select Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estabelecimentos</label>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-left flex justify-between items-center focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <span className="truncate">
                {selectedEstIds.length === 0 
                  ? 'Nenhum selecionado' 
                  : selectedEstIds.length === establishments.length 
                    ? 'Todos os estabelecimentos' 
                    : `${selectedEstIds.length} selecionados`}
              </span>
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                <div 
                  className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  onClick={toggleAllEsts}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedEstIds.length === establishments.length}
                    readOnly
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Selecionar Todos</span>
                </div>
                {establishments.map(e => (
                  <div 
                    key={e.id} 
                    className="p-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    onClick={() => toggleEstId(e.id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedEstIds.includes(e.id)}
                      readOnly
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{e.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-3 justify-end border-t border-slate-100 dark:border-slate-700 pt-4">
          <button 
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar CSV
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Printable Report Area */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none print:border-none print:p-0 transition-colors">
        {/* Print Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatório de Fluxo de Caixa</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
             {selectedEstIds.length === establishments.length 
               ? 'Todos os Estabelecimentos' 
               : selectedEstIds.length === 1 
                 ? establishments.find(e => e.id === selectedEstIds[0])?.name
                 : `${selectedEstIds.length} estabelecimentos selecionados`
             }
          </p>
        </div>

        {/* Summary Boxes */}
        <div className="grid grid-cols-3 gap-4 mb-8 border-b border-slate-200 dark:border-slate-700 pb-8">
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Entradas</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{CURRENCY_FORMATTER.format(totalEntries)}</div>
          </div>
          <div className="text-center border-l border-slate-100 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Saídas</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{CURRENCY_FORMATTER.format(totalExits)}</div>
          </div>
          <div className="text-center border-l border-slate-100 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saldo Final</div>
            <div className={`text-lg font-bold ${finalBalance >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {CURRENCY_FORMATTER.format(finalBalance)}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-medium">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Data</th>
                <th className="px-4 py-3">Estabelecimento</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma transação encontrada para este período ou filtro.
                  </td>
                </tr>
              ) : (
                filteredData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {establishments.find(e => e.id === t.establishmentId)?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">{t.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.type === TransactionType.ENTRADA 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      t.type === TransactionType.ENTRADA ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {CURRENCY_FORMATTER.format(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer for print */}
        <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          Gerado automaticamente por Fluxo de Caixa GSC em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
};