
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
import { MOCK_ESTABLISHMENTS, MOCK_TRANSACTIONS, SHEET_API_URL } from './constants';
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
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('gsc_pending_transactions');
    const pending = saved ? JSON.parse(saved) : [];
    return !SHEET_API_URL && pending.length === 0 ? MOCK_TRANSACTIONS : pending;
  });
  
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('gsc_notes_map');
    return saved ? JSON.parse(saved) : { "GENERAL": "" };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('gsc_settings');
    return saved ? JSON.parse(saved) : {
      readyDescriptions: [],
      showNotes: true,
      showAI: true,
      showChart: true,
      pushNotifications: false,
      weeklyEmailSummary: true
    };
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gsc_dark_mode') === 'true');

  useEffect(() => {
    localStorage.setItem('gsc_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const pending = transactions.filter(t => t.isSynced === false);
    localStorage.setItem('gsc_pending_transactions', JSON.stringify(pending));
  }, [transactions]);

  const syncData = useCallback(async () => {
    if (!SHEET_API_URL) {
      setIsAuthorized(true);
      setUserRole('Admin');
      return;
    }

    setIsSyncing(true);
    setSyncError(false);
    
    try {
      const pendingTransactions = transactions.filter(t => t.isSynced === false);
      if (pendingTransactions.length > 0) {
        for (const t of pendingTransactions) {
          await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', { ...t, user: user?.email });
        }
      }

      const data = await fetchSheetData(SHEET_API_URL);
      if (data) {
        setEstablishments(data.establishments);
        if (data.notes) setNotes(data.notes);
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        
        const remoteTransactions = data.transactions.map(t => ({ ...t, isSynced: true }));
        const localPending = transactions.filter(t => t.isSynced === false);
        const combined = [...localPending];
        remoteTransactions.forEach(rt => {
           if (!combined.some(ct => ct.id === rt.id)) combined.push(rt);
        });

        setTransactions(combined);
        setAuthorizedUsers(data.authorizedUsers);
        setLastSync(new Date());
        
        if (user) {
          const authUser = data.authorizedUsers.find(
            u => u.email.toLowerCase().trim() === user.email.toLowerCase().trim()
          );
          if (authUser) {
            setIsAuthorized(true);
            setUserRole(authUser.role);
          } else {
            setIsAuthorized(false);
          }
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncError(true);
      if (lastSync === null) {
        setIsAuthorized(true);
        setUserRole('Admin');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, transactions, lastSync]);

  useEffect(() => { syncData(); }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleSaveTransaction = async (transaction: Transaction) => {
    if (userRole === 'Convidado') return;
    const enriched = { ...transaction, user: user?.email || 'unknown', isSynced: false };
    setTransactions(prev => [enriched, ...prev]);
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', enriched);
      if (success) setTransactions(prev => prev.map(t => t.id === enriched.id ? { ...t, isSynced: true } : t));
    }
  };

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    if (userRole === 'Convidado') return;
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...updatedTransaction, isSynced: false } : t));
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'EDIT_TRANSACTION', { ...updatedTransaction, user: user?.email });
      if (success) setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...t, isSynced: true } : t));
    }
  };

  const handleSaveNote = async (newNote: string, entityId: string = "GENERAL") => {
    if (userRole === 'Convidado') return;
    setNotes(prev => ({ ...prev, [entityId]: newNote }));
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'UPDATE_NOTE', { notes: newNote, entityId, user: user?.email });
    }
  };

  const handleAddEstablishment = async (establishment: Establishment) => {
    if (userRole !== 'Admin') return;
    setEstablishments(prev => [...prev, establishment]);
    if (SHEET_API_URL) await postToSheet(SHEET_API_URL, 'ADD_ESTABLISHMENT', { ...establishment, user: user?.email });
  };

  const handleUpdateEstablishment = async (updated: Establishment) => {
    if (userRole !== 'Admin') return;
    setEstablishments(prev => prev.map(est => est.id === updated.id ? updated : est));
    if (SHEET_API_URL) await postToSheet(SHEET_API_URL, 'EDIT_ESTABLISHMENT', { ...updated, user: user?.email });
  };

  const handleAddUser = async (email: string, role: UserRole) => {
    if (userRole !== 'Admin') return;
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'ADD_USER', { email, role, user: user?.email });
      syncData();
    }
  };

  const handleEditUser = async (oldEmail: string, email: string, role: UserRole) => {
    if (userRole !== 'Admin') return;
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'EDIT_USER', { id: oldEmail, email, role, user: user?.email });
      syncData();
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (userRole !== 'Admin') return;
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'DELETE_USER', { id: email, user: user?.email });
      syncData();
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    if (userRole === 'Convidado') return;
    setSettings(newSettings);
    if (SHEET_API_URL) await postToSheet(SHEET_API_URL, 'UPDATE_SETTINGS', { settings: newSettings, user: user?.email });
  };

  if (!user) return <Login onLogin={setUser} />;
  if (isAuthorized === null) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-bold">Carregando permissões...</div>;
  if (isAuthorized === false) return <AccessDenied email={user.email} onLogout={() => setUser(null)} onRefresh={syncData} />;

  return (
    <HashRouter>
      <Layout darkMode={darkMode} isSyncing={isSyncing} lastSync={lastSync} onSync={syncData} syncError={syncError} user={user} onLogout={() => setUser(null)} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} notes={notes} onSaveNote={handleSaveNote} settings={settings} userRole={userRole} />} />
          <Route path="/establishment/:id" element={<EstablishmentDetail establishments={establishments} transactions={transactions} onUpdateTransaction={handleUpdateTransaction} settings={settings} userRole={userRole} />} />
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} settings={settings} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route path="/settings" element={<Settings establishments={establishments} authorizedUsers={authorizedUsers} onAddEstablishment={handleAddEstablishment} onUpdateEstablishment={handleUpdateEstablishment} onAddUser={handleAddUser} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} onUpdateSettings={handleUpdateSettings} userRole={userRole} />} />
          <Route path="/reports" element={<Reports establishments={establishments} transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
