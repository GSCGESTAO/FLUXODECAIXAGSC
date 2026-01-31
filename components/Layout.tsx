
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  isSyncing?: boolean;
  lastSync?: Date | null;
  onSync?: () => void;
  syncError?: boolean;
  user: UserProfile;
  onLogout: () => void;
  pendingCount?: number;
  userRole?: UserRole | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  darkMode, 
  isSyncing = false, 
  lastSync = null, 
  onSync,
  syncError = false,
  user,
  onLogout,
  pendingCount = 0,
  userRole = 'Convidado'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (p: string) => path === p;
  const isFormPage = path === '/new' || path === '/transfer';
  const isConvidado = userRole === 'Convidado';

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20 md:pb-0 print:bg-white print:pb-0 transition-colors duration-200">
        
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 px-4 py-3 shadow-sm flex items-center justify-between print:hidden transition-colors duration-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">$</div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Fluxo GSC</h1>
            </div>
            
            {onSync && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSync(); }}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group relative"
              >
                <div className={`w-2 h-2 rounded-full ${syncError ? 'bg-rose-500' : (pendingCount > 0 ? 'bg-amber-500 animate-pulse' : (lastSync ? 'bg-emerald-500' : 'bg-slate-300'))}`}></div>
                <div className="flex items-center gap-1.5">
                  <svg className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hidden sm:inline uppercase tracking-tighter">{isSyncing ? 'Sync...' : (pendingCount > 0 ? `${pendingCount} P` : 'OK')}</span>
                </div>
              </button>
            )}
          </div>
          
          <div className="hidden md:flex items-center gap-6">
             <button onClick={() => navigate('/')} className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}>Dashboard</button>
             <button onClick={() => navigate('/reports')} className={`text-sm font-medium transition-colors ${isActive('/reports') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}>Relatórios</button>
             <button onClick={() => navigate('/settings')} className={`text-sm font-medium transition-colors ${isActive('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}>Ajustes</button>
          </div>

          <div className="relative">
             <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 p-1 pr-2 rounded-full transition-colors">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner">
                 <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
               </div>
               <div className="hidden sm:block text-left">
                  <div className="text-[10px] font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[120px]">{user.name}</div>
                  <div className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold uppercase">{userRole}</div>
               </div>
             </button>
             {showUserMenu && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                 <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button onClick={() => { setShowUserMenu(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">Ajustes</button>
                    <button onClick={() => { setShowUserMenu(false); onLogout(); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-700 mt-1">Sair do Sistema</button>
                 </div>
               </>
             )}
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 md:p-6 print:max-w-none print:p-0">
          {children}
        </main>

        {!isFormPage && !isConvidado && (
          <div className="fixed bottom-24 md:bottom-8 right-6 flex items-center gap-3 z-40 print:hidden">
            <button onClick={() => navigate('/transfer')} className="w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center border-2 border-white dark:border-slate-800 hover:scale-110 active:scale-95 transition-all"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 8l4 4m0 0l-4 4m4-4H3m13-4V4m-4 16v-4"/></svg></button>
            <button onClick={() => navigate('/new')} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center border-2 border-white dark:border-slate-800 hover:scale-110 active:scale-95 transition-all"><svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
          </div>
        )}

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around p-3 z-50 print:hidden transition-colors">
          <button onClick={() => navigate('/')} className={`flex flex-col items-center ${isActive('/') ? 'text-indigo-600' : 'text-slate-400'}`}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span className="text-[10px] mt-1">Início</span></button>
          <button onClick={() => navigate('/reports')} className={`flex flex-col items-center ${isActive('/reports') ? 'text-indigo-600' : 'text-slate-400'}`}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span className="text-[10px] mt-1">Relatórios</span></button>
          <button onClick={() => navigate('/settings')} className={`flex flex-col items-center ${isActive('/settings') ? 'text-indigo-600' : 'text-slate-400'}`}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83a2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0a2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2a2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.29 1.52a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0a2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span className="text-[10px] mt-1">Ajustes</span></button>
        </nav>
      </div>
    </div>
  );
};
