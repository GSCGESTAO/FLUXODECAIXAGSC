
import React, { useState } from 'react';
import { Establishment } from '../types';

interface SettingsProps {
  establishments: Establishment[];
  onAddEstablishment: (est: Establishment) => void;
  onUpdateEstablishment: (est: Establishment) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  establishments, 
  onAddEstablishment, 
  onUpdateEstablishment,
  darkMode, 
  setDarkMode
}) => {
  // Add State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [currency, setCurrency] = useState('BRL');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const newEst: Establishment = {
      id: crypto.randomUUID(),
      name: newName,
      responsibleEmail: newEmail
    };

    onAddEstablishment(newEst);
    setNewName('');
    setNewEmail('');
    setIsAdding(false);
  };

  const handleStartEdit = (est: Establishment) => {
    setEditingId(est.id);
    setEditName(est.name);
    setEditEmail(est.responsibleEmail);
  };

  const handleSaveEdit = () => {
    if (editingId && editName && editEmail) {
        onUpdateEstablishment({
            id: editingId,
            name: editName,
            responsibleEmail: editEmail
        });
        setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex justify-between items-center py-3">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ajustes</h2>

      {/* Establishment Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Meus Estabelecimentos
          </h3>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {isAdding ? 'Cancelar' : 'Adicionar Novo'}
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 animate-fade-in">
            <div className="grid gap-3">
               <input 
                 type="text" 
                 placeholder="Nome do Estabelecimento" 
                 className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 required
               />
               <input 
                 type="email" 
                 placeholder="Email do Gerente" 
                 className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                 value={newEmail}
                 onChange={e => setNewEmail(e.target.value)}
                 required
               />
               <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
                 Salvar Estabelecimento
               </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {establishments.map(est => (
            <div key={est.id} className="p-4 flex flex-col sm:flex-row justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors gap-3">
              {editingId === est.id ? (
                <div className="w-full flex flex-col sm:flex-row gap-2 items-center animate-fade-in">
                    <div className="flex-1 w-full grid gap-2">
                        <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)}
                            className="w-full p-1.5 border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                            placeholder="Nome"
                        />
                        <input 
                            type="text" 
                            value={editEmail} 
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full p-1.5 border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                            placeholder="Email"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onClick={handleCancelEdit} className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>
              ) : (
                <>
                  <div className="text-center sm:text-left">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{est.name}</div>
                    <div className="text-xs text-slate-400">{est.responsibleEmail}</div>
                  </div>
                  <button onClick={() => handleStartEdit(est)} className="text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* General Preferences */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Geral
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <Toggle label="Modo Escuro" checked={darkMode} onChange={setDarkMode} />
                <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Moeda Padrão</span>
                    <select 
                        value={currency} 
                        onChange={e => setCurrency(e.target.value)}
                        className="text-sm border border-slate-300 dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
                    >
                        <option value="BRL">BRL (R$)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                    </select>
                </div>
                <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Idioma</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Português (BR)</span>
                </div>
            </div>
          </div>

          {/* AI & Notifications */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Inteligência & Notificações
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <Toggle label="Sugestões Automáticas (IA)" checked={aiSuggestions} onChange={setAiSuggestions} />
                <Toggle label="Alertas de Anomalia" checked={true} onChange={() => {}} />
                <Toggle label="Resumo Semanal por E-mail" checked={emailNotifications} onChange={setEmailNotifications} />
                <Toggle label="Notificações Push" checked={pushNotifications} onChange={setPushNotifications} />
            </div>
          </div>
      </div>
      
      <div className="text-center text-xs text-slate-400 mt-8">
        ID do Usuário: user_88293 • Build: 2024.10.15
      </div>
    </div>
  );
};
