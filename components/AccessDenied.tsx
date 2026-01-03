
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
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-md w-full p-8 rounded-2xl shadow-xl border border-rose-100 dark:border-rose-900/30 text-center animate-fade-in">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Olá, <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>. 
          Sua conta foi autenticada, mas este e-mail não está na lista de permissões.
        </p>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-sm text-slate-500 dark:text-slate-400 mb-8 text-left border border-slate-100 dark:border-slate-700">
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Como resolver:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>O administrador deve adicionar seu e-mail (pessoal ou corporativo) na <strong>coluna B</strong> da aba <strong>'Usuarios'</strong>.</li>
            <li>Certifique-se que o e-mail na planilha é exatamente: <code className="bg-white dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">{email}</code></li>
            <li>Após salvar as alterações na planilha, clique no botão abaixo para tentar novamente.</li>
          </ol>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando...
              </>
            ) : (
              'Verificar permissão agora'
            )}
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  );
};
