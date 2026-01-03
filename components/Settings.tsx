
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

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const EditIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  const TrashIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Ajustes</h2>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {isAdmin && <button onClick={() => setActiveTab('estab')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'estab' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unidades</button>}
        {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Usuários</button>}
        {(isAdmin || isFinanceiro) && <button onClick={() => setActiveTab('desc')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'desc' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Descrições</button>}
        <button onClick={() => setActiveTab('pref')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'pref' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Preferências</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        
        {activeTab === 'estab' && isAdmin && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-slate-400">Gerenciar Unidades</h3>
              <button onClick={() => setFormEst({name: '', email: ''})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Novo Restaurante</button>
            </div>
            {formEst && (
              <div className="p-6 bg-indigo-50/20 space-y-3">
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
              <div key={est.id} className="p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <div><div className="font-bold text-slate-800 dark:text-white">{est.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{est.responsibleEmail}</div></div>
                <button onClick={() => setFormEst({id: est.id, name: est.name, email: est.responsibleEmail})} className="p-2 text-slate-400 hover:text-indigo-600"><EditIcon /></button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-slate-400">Usuários Autorizados</h3>
                <button onClick={() => setFormUser({email: '', role: 'Convidado'})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Autorizar Novo</button>
             </div>
             {(formUser) && (
               <div className="p-6 bg-indigo-50/20 space-y-4">
                  <input placeholder="E-mail Gmail" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900" />
                  <select value={formUser.role} onChange={e => setFormUser({...formUser, role: e.target.value as UserRole})} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                    <option value="Admin">Admin</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Convidado">Convidado</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setFormUser(null)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                    <button onClick={() => {
                        if (formUser.oldEmail) onEditUser(formUser.oldEmail, formUser.email, formUser.role);
                        else onAddUser(formUser.email, formUser.role);
                        setFormUser(null);
                    }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Confirmar</button>
                  </div>
               </div>
             )}
             {authorizedUsers.map(u => (
               <div key={u.email} className="p-6 flex items-center justify-between">
                 <div>
                   <div className="text-sm font-bold">{u.email}</div>
                   <div className="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 rounded-md font-black uppercase mt-1 inline-block">{u.role}</div>
                 </div>
                 <div className="flex gap-3">
                   <button onClick={() => setFormUser({oldEmail: u.email, email: u.email, role: u.role})} className="p-2 text-slate-400 hover:text-indigo-600"><EditIcon /></button>
                   <button onClick={() => confirm(`Excluir ${u.email}?`) && onDeleteUser(u.email)} className="p-2 text-slate-400 hover:text-rose-600"><TrashIcon /></button>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'desc' && (isAdmin || isFinanceiro) && (
          <div className="p-6 space-y-6">
              <h3 className="font-bold text-sm uppercase text-slate-400">Descrições Rápidas (Até 4)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Opção {i + 1}</label>
                    <input 
                      value={settings.readyDescriptions[i] || ""} 
                      onChange={e => {
                        const newDescs = [...settings.readyDescriptions];
                        newDescs[i] = e.target.value;
                        onUpdateSettings({...settings, readyDescriptions: newDescs});
                      }} 
                      placeholder="Ex: Compra Bebidas" 
                      className="w-full p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                    />
                  </div>
                ))}
              </div>
          </div>
        )}

        {activeTab === 'pref' && (
          <div className="p-6 space-y-1">
             <Toggle label="Modo Escuro" checked={darkMode} onChange={setDarkMode} />
             <Toggle label="Exibir Mural de Anotações" checked={settings.showNotes} onChange={v => onUpdateSettings({...settings, showNotes: v})} />
             <Toggle label="Exibir Assistente IA" checked={settings.showAI} onChange={v => onUpdateSettings({...settings, showAI: v})} />
             <Toggle label="Exibir Gráfico de Curva" checked={settings.showChart} onChange={v => onUpdateSettings({...settings, showChart: v})} />
             <Toggle label="Notificações Push" checked={settings.pushNotifications} onChange={v => onUpdateSettings({...settings, pushNotifications: v})} />
             <Toggle label="Resumo Semanal por E-mail" checked={settings.weeklyEmailSummary} onChange={v => onUpdateSettings({...settings, weeklyEmailSummary: v})} />
          </div>
        )}
      </div>
    </div>
  );
};
