
import React, { useState } from 'react';
import { Establishment, AuthorizedUser, AppSettings } from '../types';

interface SettingsProps {
  establishments: Establishment[];
  authorizedUsers: AuthorizedUser[];
  onAddEstablishment: (est: Establishment) => void;
  onUpdateEstablishment: (est: Establishment) => void;
  onAddUser: (email: string) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  establishments, 
  authorizedUsers,
  onAddEstablishment, 
  onUpdateEstablishment,
  onAddUser,
  darkMode, 
  setDarkMode,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'estab' | 'desc' | 'users' | 'pref'>('estab');
  
  // Establishment States
  const [isAddingEst, setIsAddingEst] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // User State
  const [newUserEmail, setNewUserEmail] = useState('');

  const handleUpdatePreference = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleUpdateDescription = (index: number, value: string) => {
    const newDescs = [...settings.readyDescriptions];
    newDescs[index] = value;
    handleUpdatePreference('readyDescriptions', newDescs);
  };

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Ajustes do Sistema</h2>

      {/* Tabs Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {[
          { id: 'estab', label: 'Estabelecimentos' },
          { id: 'desc', label: 'Descrições' },
          { id: 'users', label: 'Usuários' },
          { id: 'pref', label: 'Preferências' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        
        {/* Tab: Estabelecimentos */}
        {activeTab === 'estab' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 animate-fade-in">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 dark:text-slate-200">Unidades Ativas</h3>
              <button onClick={() => setIsAddingEst(!isAddingEst)} className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700">{isAddingEst ? 'Fechar' : 'Nova Unidade'}</button>
            </div>
            {isAddingEst && (
              <form className="p-6 space-y-3 bg-indigo-50/30 dark:bg-indigo-900/10" onSubmit={e => {
                e.preventDefault();
                onAddEstablishment({ id: crypto.randomUUID(), name: newName, responsibleEmail: newEmail });
                setNewName(''); setNewEmail(''); setIsAddingEst(false);
              }}>
                <input required placeholder="Nome do Restaurante" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                <input required type="email" placeholder="Email do Gerente" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm">Cadastrar</button>
              </form>
            )}
            {establishments.map(est => (
              <div key={est.id} className="p-6 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">{est.name}</div>
                  <div className="text-xs text-slate-400 font-medium">{est.responsibleEmail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Descrições Prontas */}
        {activeTab === 'desc' && (
          <div className="p-6 space-y-6 animate-fade-in">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">Descrições Rápidas (Até 4)</h3>
              <p className="text-xs text-slate-500 mb-6">Estas descrições aparecerão como botões de atalho na tela de novo lançamento.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opção {i + 1}</label>
                    <input 
                      value={settings.readyDescriptions[i] || ""} 
                      onChange={e => handleUpdateDescription(i, e.target.value)}
                      placeholder="Ex: Compra Bebidas" 
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Usuários */}
        {activeTab === 'users' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 animate-fade-in">
             <div className="p-6">
               <h3 className="font-bold text-slate-800 dark:text-white mb-4">Autorizar Novo E-mail</h3>
               <div className="flex gap-2">
                 <input 
                  type="email" 
                  value={newUserEmail} 
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="email@gmail.com" 
                  className="flex-1 p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm" 
                 />
                 <button 
                  onClick={() => { if(newUserEmail) { onAddUser(newUserEmail); setNewUserEmail(""); } }}
                  className="bg-indigo-600 text-white px-6 rounded-xl font-bold text-xs"
                 >Adicionar</button>
               </div>
             </div>
             <div className="p-6 space-y-4">
               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuários com Acesso</h4>
               {authorizedUsers.map(u => (
                 <div key={u.email} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                   <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{u.email}</div>
                   <div className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-2 py-1 rounded-md font-bold uppercase">{u.role}</div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Tab: Preferências (Toggles) */}
        {activeTab === 'pref' && (
          <div className="p-6 space-y-1 animate-fade-in">
             <Toggle label="Modo Escuro" checked={darkMode} onChange={setDarkMode} />
             <Toggle label="Exibir Mural de Anotações" checked={settings.showNotes} onChange={v => handleUpdatePreference('showNotes', v)} />
             <Toggle label="Exibir Assistente Financeiro IA" checked={settings.showAI} onChange={v => handleUpdatePreference('showAI', v)} />
             <Toggle label="Exibir Gráfico de Tendência (Curva)" checked={settings.showChart} onChange={v => handleUpdatePreference('showChart', v)} />
             <Toggle label="Notificações de Lançamentos (Navegador)" checked={settings.pushNotifications} onChange={v => handleUpdatePreference('pushNotifications', v)} />
             <Toggle label="Resumo Semanal para Email do Gerente" checked={settings.weeklyEmailSummary} onChange={v => handleUpdatePreference('weeklyEmailSummary', v)} />
          </div>
        )}
      </div>

      <div className="text-center">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Fluxo GSC v1.6 Cloud</p>
      </div>
    </div>
  );
};
