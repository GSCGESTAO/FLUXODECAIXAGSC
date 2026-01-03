
import React from 'react';

interface AccessDeniedProps {
  email: string;
  onLogout: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ email, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-md w-full p-8 rounded-2xl shadow-xl border border-rose-100 dark:border-rose-900/30 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Olá, <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>. 
          Sua conta Google foi autenticada, mas você ainda não tem permissão para acessar este sistema.
        </p>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-sm text-slate-500 dark:text-slate-400 mb-8 text-left italic">
          "Solicite ao administrador que adicione seu e-mail na aba 'Usuarios' da planilha de controle."
        </div>
        <button 
          onClick={onLogout}
          className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors"
        >
          Tentar com outra conta
        </button>
      </div>
    </div>
  );
};
