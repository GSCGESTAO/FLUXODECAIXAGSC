
import React, { useState } from 'react';
import { Establishment, AuthorizedUser, AppSettings, UserRole } from '../types';

interface SettingsProps {
  establishments: Establishment[];
  authorizedUsers: AuthorizedUser[];
  onAddEstablishment: (est: Establishment) => void;
  onUpdateEstablishment: (est: Establishment) => void;
  onAddUser: (email: string, role: UserRole) => void;
  onEditUser: (oldEmail: string, email: string, role: UserRole) => void;
  onDeleteUser: (email: string) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  userRole?: UserRole | null;
}

export const Settings: React.FC<SettingsProps> = ({ 
  establishments, authorizedUsers, onAddEstablishment, onUpdateEstablishment, 
  onAddUser, onEditUser, onDeleteUser, darkMode, setDarkMode, settings, onUpdateSettings, userRole 
}) => {
  const isAdmin = userRole === 'Admin';
  const isFinanceiro = userRole === 'Financeiro';
  const [activeTab, setActiveTab] = useState<'estab' | 'users' | 'desc' | 'pref'>(isAdmin ? 'estab' : 'pref');

  const [formEst, setFormEst] = useState<{id?: string, name: string, email: string} | null>(null);
  const [formUser, setFormUser] = useState<{oldEmail?: string, email: string, role: UserRole} | null>(null);

  const EditIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 6h18"></path>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    </svg>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Ajustes do Sistema</h2>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
        {isAdmin && <button onClick={() => setActiveTab('estab')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'estab' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unidades</button>}
        {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Usuários</button>}
        {(isAdmin || isFinanceiro) && <button onClick={() => setActiveTab('desc')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'desc' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Descrições</button>}
        <button onClick={() => setActiveTab('pref')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'pref' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Preferências</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        
        {activeTab === 'estab' && isAdmin && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-slate-400">Restaurantes</h3>
                <button onClick={() => setFormEst({name: '', email: ''})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Novo Restaurante</button>
             </div>
             {formEst && (
               <div className="p-6 bg-indigo-50/20 space-y-3 animate-fade-in">
                  <input placeholder="Nome" value={formEst.name} onChange={e => setFormEst({...formEst, name: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900" />
                  <input placeholder="E-mail Gerente" value={formEst.email} onChange={e => setFormEst({...formEst, email: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900" />
                  <div className="flex gap-2">
                     <button onClick={() => setFormEst(null)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                     <button onClick={() => {
                         if (formEst.id) onUpdateEstablishment({id: formEst.id, name: formEst.name, responsibleEmail: formEst.email});
                         else onAddEstablishment({id: crypto.randomUUID(), name: formEst.name, responsibleEmail: formEst.email});
                         setFormEst(null);
                     }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Salvar</button>
                  </div>
               </div>
             )}
             {establishments.map(est => (
               <div key={est.id} className="p-6 flex justify-between items-center group">
                 <div><div className="font-bold text-slate-800 dark:text-white">{est.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{est.responsibleEmail}</div></div>
                 <button onClick={() => setFormEst({id: est.id, name: est.name, email: est.responsibleEmail})} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><EditIcon /></button>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-slate-400">Usuários Ativos</h3>
                <button onClick={() => setFormUser({email: '', role: 'Convidado'})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Autorizar E-mail</button>
             </div>
             {formUser && (
               <div className="p-6 bg-indigo-50/20 space-y-4 animate-fade-in">
                  <input placeholder="E-mail Gmail" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                  <div className="flex gap-2">
                    {(['Admin', 'Financeiro', 'Convidado'] as UserRole[]).map(r => (
                      <button key={r} onClick={() => setFormUser({...formUser, role: r})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${formUser.role === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200'}`}>{r}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setFormUser(null)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                    <button onClick={() => {
                        if (formUser.oldEmail) onEditUser(formUser.oldEmail, formUser.email, formUser.role);
                        else onAddUser(formUser.email, formUser.role);
                        setFormUser(null);
                    }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Atualizar</button>
                  </div>
               </div>
             )}
             {authorizedUsers.map(u => (
               <div key={u.email} className="p-6 flex items-center justify-between group">
                 <div>
                   <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{u.email}</div>
                   <div className={`text-[10px] px-2 py-0.5 rounded font-black uppercase mt-1 inline-block ${u.role === 'Admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>{u.role}</div>
                 </div>
                 <div className="flex gap-1">
                    <button onClick={() => setFormUser({oldEmail: u.email, email: u.email, role: u.role})} className="p-2 text-slate-300 hover:text-indigo-600"><EditIcon /></button>
                    <button onClick={() => confirm(`Excluir ${u.email}?`) && onDeleteUser(u.email)} className="p-2 text-slate-300 hover:text-rose-600"><TrashIcon /></button>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'pref' && (
          <div className="p-6 space-y-4">
             <div className="flex justify-between items-center py-4 border-b dark:border-slate-700">
               <span className="text-sm font-medium">Modo Escuro</span>
               <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
               </button>
             </div>
             <div className="flex justify-between items-center py-4">
               <span className="text-sm font-medium">IA e Mural</span>
               <button onClick={() => onUpdateSettings({...settings, showAI: !settings.showAI, showNotes: !settings.showNotes})} className={`w-12 h-6 rounded-full transition-colors relative ${settings.showAI ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showAI ? 'left-7' : 'left-1'}`} />
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
