
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
  // Removida a aba 'groups'
  const [activeTab, setActiveTab] = useState<'estab' | 'users' | 'desc' | 'pref'>(isAdmin ? 'estab' : 'pref');

  const [formEst, setFormEst] = useState<{id?: string, name: string, email: string} | null>(null);
  const [formUser, setFormUser] = useState<{oldEmail?: string, email: string, role: UserRole} | null>(null);
  const [newDesc, setNewDesc] = useState('');

  const EditIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    </svg>
  );

  const handleAddDesc = () => {
    if (!newDesc.trim()) return;
    const current = settings.readyDescriptions || [];
    if (current.includes(newDesc.trim())) return;
    onUpdateSettings({ ...settings, readyDescriptions: [...current, newDesc.trim()] });
    setNewDesc('');
  };

  const handleRemoveDesc = (val: string) => {
    onUpdateSettings({ ...settings, readyDescriptions: settings.readyDescriptions.filter(d => d !== val) });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Painel de Controle</h2>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {isAdmin && <button onClick={() => setActiveTab('estab')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'estab' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unidades</button>}
        {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Acessos</button>}
        {(isAdmin || isFinanceiro) && <button onClick={() => setActiveTab('desc')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'desc' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Sugestões</button>}
        <button onClick={() => setActiveTab('pref')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'pref' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Preferências</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all duration-300">
        
        {activeTab === 'estab' && isAdmin && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                <h3 className="font-bold text-xs uppercase text-slate-400">Estabelecimentos</h3>
                <button onClick={() => setFormEst({name: '', email: ''})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Nova Unidade</button>
             </div>
             {formEst && (
               <div className="p-6 bg-indigo-50/20 space-y-3 animate-fade-in">
                  <input placeholder="Nome da Casa" value={formEst.name} onChange={e => setFormEst({...formEst, name: e.target.value})} className="w-full p-4 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold" />
                  <input placeholder="E-mail Responsável" value={formEst.email} onChange={e => setFormEst({...formEst, email: e.target.value})} className="w-full p-4 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                  <div className="flex gap-2">
                     <button onClick={() => setFormEst(null)} className="flex-1 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                     <button onClick={() => {
                         if (formEst.id) onUpdateEstablishment({id: formEst.id, name: formEst.name, responsibleEmail: formEst.email});
                         else onAddEstablishment({id: crypto.randomUUID(), name: formEst.name, responsibleEmail: formEst.email});
                         setFormEst(null);
                     }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase">Salvar</button>
                  </div>
               </div>
             )}
             {establishments.map(est => (
               <div key={est.id} className="p-6 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                 <div><div className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">{est.name}</div><div className="text-[10px] text-slate-400 font-bold">{est.responsibleEmail}</div></div>
                 <button onClick={() => setFormEst({id: est.id, name: est.name, email: est.responsibleEmail})} className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-indigo-600 transition-all rounded-xl"><EditIcon /></button>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'desc' && (isAdmin || isFinanceiro) && (
          <div className="p-6 space-y-6">
             <div>
                <h3 className="font-black text-[10px] uppercase text-slate-400 mb-4 tracking-[0.2em]">Cadastrar Descrição Padrão</h3>
                <div className="flex gap-2">
                  <input 
                    placeholder="Ex: Compra Bebida, Luz, Aluguel..." 
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleAddDesc()}
                    className="flex-1 p-4 rounded-2xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold outline-none" 
                  />
                  <button onClick={handleAddDesc} className="bg-indigo-600 text-white px-6 rounded-2xl text-[10px] font-black uppercase">Adicionar</button>
                </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {(settings.readyDescriptions || []).map((desc, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl group transition-all hover:bg-slate-100">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{desc}</span>
                    <button onClick={() => handleRemoveDesc(desc)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'pref' && (
          <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700">
             <div className="flex justify-between items-center py-5">
               <div><h4 className="text-xs font-black uppercase tracking-tight">Modo Escuro</h4><p className="text-[10px] text-slate-400 font-bold uppercase">Aparência da interface</p></div>
               <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`} /></button>
             </div>
             <div className="flex justify-between items-center py-5">
               <div><h4 className="text-xs font-black uppercase tracking-tight">Assistente Financeiro IA</h4><p className="text-[10px] text-slate-400 font-bold uppercase">Uso de Gemini PRO</p></div>
               <button onClick={() => onUpdateSettings({...settings, showAI: !settings.showAI})} className={`w-12 h-6 rounded-full transition-colors relative ${settings.showAI ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showAI ? 'left-7' : 'left-1'}`} /></button>
             </div>
             <div className="flex justify-between items-center py-5">
               <div><h4 className="text-xs font-black uppercase tracking-tight">Mural e Gráficos</h4><p className="text-[10px] text-slate-400 font-bold uppercase">Widgets da Dashboard</p></div>
               <div className="flex gap-4">
                 <button onClick={() => onUpdateSettings({...settings, showChart: !settings.showChart})} className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all ${settings.showChart ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'text-slate-300'}`}>Gráficos</button>
                 <button onClick={() => onUpdateSettings({...settings, showNotes: !settings.showNotes})} className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all ${settings.showNotes ? 'bg-amber-50 border-amber-200 text-amber-600' : 'text-slate-300'}`}>Mural</button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
