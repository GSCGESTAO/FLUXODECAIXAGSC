
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EstablishmentDetail } from './components/EstablishmentDetail';
import { TransactionForm } from './components/TransactionForm';
import { TransferForm } from './components/TransferForm';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { AccessDenied } from './components/AccessDenied';
import { MOCK_ESTABLISHMENTS, SHEET_API_URL } from './constants';
import { Transaction, Establishment, UserProfile, AuthorizedUser, AppSettings, UserRole } from './types';
import { fetchSheetData, postToSheet } from './services/sheetService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('gsc_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>(MOCK_ESTABLISHMENTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [notes, setNotes] = useState<Record<string, string>>({ "GENERAL": "" });
  const [settings, setSettings] = useState<AppSettings>({
    readyDescriptions: [],
    showNotes: true,
    showAI: true,
    showChart: true,
    pushNotifications: false,
    weeklyEmailSummary: true
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gsc_dark_mode') === 'true');

  const syncData = useCallback(async () => {
    if (!SHEET_API_URL) {
      setIsAuthorized(true);
      setUserRole('Admin');
      return;
    }

    setIsSyncing(true);
    setSyncError(false);
    
    try {
      const data = await fetchSheetData(SHEET_API_URL);
      if (data) {
        setEstablishments(data.establishments);
        if (data.notes) setNotes(data.notes);
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        
        const remoteTransactions = data.transactions.map(t => ({ ...t, isSynced: true }));
        setTransactions(remoteTransactions);
        setAuthorizedUsers(data.authorizedUsers);
        setLastSync(new Date());
        
        if (user) {
          const authUser = data.authorizedUsers.find(
            u => u.email.toLowerCase().trim() === user.email.toLowerCase().trim()
          );
          if (authUser) {
            setUserRole(authUser.role);
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        }
      } else {
        setSyncError(true);
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) syncData();
  }, [user?.email, syncData]);

  useEffect(() => {
    localStorage.setItem('gsc_user', user ? JSON.stringify(user) : '');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gsc_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gsc_dark_mode', 'false');
    }
  }, [user, darkMode]);

  const handleEditUser = async (oldEmail: string, email: string, role: UserRole) => {
    if (userRole !== 'Admin') return;
    setIsSyncing(true);
    const success = await postToSheet(SHEET_API_URL, 'EDIT_USER', { id: oldEmail, email, role, user: user?.email });
    if (success) await syncData();
    setIsSyncing(false);
  };

  if (!user) return <Login onLogin={setUser} />;
  
  if (syncError && isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Erro de Comunicação</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs">Não conseguimos conectar com a base de dados GSC.</p>
        <button onClick={syncData} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">Tentar Novamente</button>
        <button onClick={() => setUser(null)} className="mt-2 text-slate-400 text-xs font-bold uppercase">Sair</button>
      </div>
    );
  }

  if (isAuthorized === null) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Validando Acesso GSC</h2>
      <p className="text-slate-500 text-sm mt-2">Isso deve levar apenas alguns instantes...</p>
    </div>
  );
  
  if (isAuthorized === false) return <AccessDenied email={user.email} onLogout={() => setUser(null)} onRefresh={syncData} />;

  return (
    <HashRouter>
      <Layout darkMode={darkMode} isSyncing={isSyncing} lastSync={lastSync} onSync={syncData} syncError={syncError} user={user} onLogout={() => setUser(null)} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} notes={notes} onSaveNote={(n, e) => postToSheet(SHEET_API_URL, 'UPDATE_NOTE', { notes: n, entityId: e, user: user.email }).then(() => syncData())} settings={settings} userRole={userRole} />} />
          <Route path="/establishment/:id" element={<EstablishmentDetail establishments={establishments} transactions={transactions} onUpdateTransaction={t => postToSheet(SHEET_API_URL, 'EDIT_TRANSACTION', { ...t, user: user.email }).then(() => syncData())} settings={settings} userRole={userRole} />} />
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={t => postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', { ...t, user: user.email }).then(() => syncData())} userEmail={user.email} settings={settings} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={t => postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', { ...t, user: user.email }).then(() => syncData())} userEmail={user.email} />} />
          <Route path="/settings" element={<Settings establishments={establishments} authorizedUsers={authorizedUsers} onAddEstablishment={est => postToSheet(SHEET_API_URL, 'ADD_ESTABLISHMENT', { ...est, user: user.email }).then(() => syncData())} onUpdateEstablishment={est => postToSheet(SHEET_API_URL, 'EDIT_ESTABLISHMENT', { ...est, user: user.email }).then(() => syncData())} onAddUser={(e, r) => postToSheet(SHEET_API_URL, 'ADD_USER', { email: e, role: r, user: user.email }).then(() => syncData())} onEditUser={handleEditUser} onDeleteUser={e => postToSheet(SHEET_API_URL, 'DELETE_USER', { id: e, user: user.email }).then(() => syncData())} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} onUpdateSettings={s => { setSettings(s); postToSheet(SHEET_API_URL, 'UPDATE_SETTINGS', { settings: s, user: user.email }).then(() => syncData()); }} userRole={userRole} /> } />
          <Route path="/reports" element={<Reports establishments={establishments} transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
