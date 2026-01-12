
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
    groupAIds: [],
    groupBIds: [],
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

  const normalizeDate = (raw: any): string => {
    if (!raw) return new Date().toISOString().split('T')[0];
    const s = String(raw).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return s;
  };

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
        if (data.settings) setSettings(prev => ({ 
          ...prev, 
          ...data.settings,
          readyDescriptions: data.settings.readyDescriptions || [],
          groupAIds: data.settings.groupAIds || [],
          groupBIds: data.settings.groupBIds || []
        }));
        
        // Fix: Cast 't' to any because 'isEdited' might arrive as a boolean or a string ("TRUE"/"true") from the Google Sheets API.
        const remoteTransactions = data.transactions.map((t: any) => ({
          ...t,
          date: normalizeDate(t.date),
          isSynced: true,
          isEdited: t.isEdited === true || t.isEdited === 'TRUE' || t.isEdited === 'true'
        }));

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

  const handleUpdateTransaction = async (updated: Transaction) => {
    if (userRole === 'Convidado') return;
    const item = { ...updated, isEdited: true, isSynced: false };
    setTransactions(prev => prev.map(t => t.id === item.id ? item : t));
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'EDIT_TRANSACTION', { ...item, user: user?.email });
      if (success) await syncData();
    }
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    if (userRole === 'Convidado') return;
    const item = { ...transaction, isSynced: false };
    setTransactions(prev => [item, ...prev]);
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', { ...item, user: user?.email });
      if (success) await syncData();
    }
  };

  const handleSaveNote = async (newNote: string, entityId: string = "GENERAL") => {
    if (userRole === 'Convidado') return;
    setNotes(prev => ({ ...prev, [entityId]: newNote }));
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'UPDATE_NOTE', { notes: newNote, entityId, user: user?.email });
    }
  };

  if (!user) return <Login onLogin={setUser} />;
  
  if (isAuthorized === null) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tighter uppercase">GSC • Carregando Inteligência</h2>
    </div>
  );
  
  if (isAuthorized === false) return <AccessDenied email={user.email} onLogout={() => setUser(null)} onRefresh={syncData} />;

  return (
    <HashRouter>
      <Layout darkMode={darkMode} isSyncing={isSyncing} lastSync={lastSync} onSync={syncData} syncError={syncError} user={user} onLogout={() => setUser(null)} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} notes={notes} onSaveNote={handleSaveNote} settings={settings} userRole={userRole} />} />
          <Route path="/establishment/:id" element={<EstablishmentDetail establishments={establishments} transactions={transactions} onUpdateTransaction={handleUpdateTransaction} settings={settings} userRole={userRole} />} />
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} settings={settings} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route path="/settings" element={<Settings establishments={establishments} authorizedUsers={authorizedUsers} onAddEstablishment={est => postToSheet(SHEET_API_URL, 'ADD_ESTABLISHMENT', { ...est, user: user.email }).then(() => syncData())} onUpdateEstablishment={est => postToSheet(SHEET_API_URL, 'EDIT_ESTABLISHMENT', { ...est, user: user.email }).then(() => syncData())} onAddUser={(e, r) => postToSheet(SHEET_API_URL, 'ADD_USER', { email: e, role: r, user: user.email }).then(() => syncData())} onEditUser={(old, email, role) => postToSheet(SHEET_API_URL, 'EDIT_USER', { id: old, email, role, user: user.email }).then(() => syncData())} onDeleteUser={e => postToSheet(SHEET_API_URL, 'DELETE_USER', { id: e, user: user.email }).then(() => syncData())} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} onUpdateSettings={s => { setSettings(s); postToSheet(SHEET_API_URL, 'UPDATE_SETTINGS', { settings: s, user: user.email }).then(() => syncData()); }} userRole={userRole} /> } />
          <Route path="/reports" element={<Reports establishments={establishments} transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
