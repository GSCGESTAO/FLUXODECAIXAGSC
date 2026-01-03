
import React, { useState } from 'react';

interface AccessDeniedProps {
  email: string;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ email, onLogout, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    // Pequeno delay visual para feedback
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-md w-full p-8 rounded-3xl shadow-2xl border border-rose-100 dark:border-rose-900/20 text-center animate-fade-in">
        
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6 transform -rotate-3">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Acesso Pendente</h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          Sua conta <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span> está autenticada, mas ainda não foi autorizada na planilha de controle.
        </p>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl text-left border border-slate-100 dark:border-slate-700/50 mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Como liberar o acesso:</h4>
          <ul className="space-y-3">
            <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0 font-bold">1</span>
              <span>Abra a planilha e vá na aba <strong className="text-indigo-600">Usuarios</strong>.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0 font-bold">2</span>
              <span>Adicione seu e-mail exatamente como aparece acima na <strong>coluna B</strong>.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0 font-bold">3</span>
              <span>Após salvar, clique no botão de verificar abaixo.</span>
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando planilha...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Tentar novamente
              </>
            )}
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-4 text-slate-500 dark:text-slate-400 font-bold text-sm hover:text-rose-500 transition-colors"
          >
            Sair e trocar de conta
          </button>
        </div>
      </div>
    </div>
  );
};
