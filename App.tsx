
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
import { Transaction, Establishment, UserProfile, AuthorizedUser } from './types';
import { fetchSheetData, postToSheet } from './services/sheetService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('gsc_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>(MOCK_ESTABLISHMENTS);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('gsc_pending_transactions');
    const pending = saved ? JSON.parse(saved) : [];
    // Only return mock data if there's no sheet URL and no pending
    return !SHEET_API_URL && pending.length === 0 ? MOCK_TRANSACTIONS : pending;
  });
  const [notes, setNotes] = useState<string>(localStorage.getItem('gsc_notes') || '');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gsc_dark_mode') === 'true');

  // Salva transações não sincronizadas no localStorage para persistência offline
  useEffect(() => {
    const pending = transactions.filter(t => t.isSynced === false);
    localStorage.setItem('gsc_pending_transactions', JSON.stringify(pending));
  }, [transactions]);

  const syncData = useCallback(async () => {
    if (!SHEET_API_URL) {
      setIsAuthorized(true);
      return;
    }

    setIsSyncing(true);
    setSyncError(false);
    
    try {
      // 1. FORÇAR ENVIO (PUSH)
      const pendingTransactions = transactions.filter(t => t.isSynced === false);
      if (pendingTransactions.length > 0) {
        for (const t of pendingTransactions) {
          try {
            const success = await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', t);
            if (success) {
              setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, isSynced: true } : item));
            }
          } catch (e) {
            console.error(`Falha ao enviar transação ${t.id}:`, e);
          }
        }
      }

      // 2. RECEBER DADOS (PULL)
      const data = await fetchSheetData(SHEET_API_URL);
      if (data) {
        setEstablishments(data.establishments);
        if (data.notes !== undefined) {
          setNotes(data.notes);
          localStorage.setItem('gsc_notes', data.notes);
        }
        
        const remoteTransactions = data.transactions.map(t => ({ ...t, isSynced: true }));
        const localPending = transactions.filter(t => t.isSynced === false);
        
        const combined = [...localPending];
        remoteTransactions.forEach(rt => {
           if (!combined.some(ct => ct.id === rt.id)) {
             combined.push(rt);
           }
        });

        setTransactions(combined);
        setAuthorizedUsers(data.authorizedUsers);
        setLastSync(new Date());
        
        if (user) {
          const userEmailClean = user.email.toLowerCase().trim();
          const isUserInList = data.authorizedUsers.some(
            u => u.email.toLowerCase().trim() === userEmailClean
          );
          setIsAuthorized(isUserInList);
        }
      }
    } catch (err) {
      console.error("Erro no sync:", err);
      setSyncError(true);
      if (lastSync === null) setIsAuthorized(true);
    } finally {
      setIsSyncing(false);
    }
  }, [user, transactions, lastSync]);

  useEffect(() => {
    syncData();
  }, []); 

  useEffect(() => {
    localStorage.setItem('gsc_dark_mode', String(darkMode));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleLogin = (newUser: UserProfile) => {
    localStorage.setItem('gsc_user', JSON.stringify(newUser));
    setUser(newUser);
    setIsAuthorized(null);
    syncData();
  };

  const handleLogout = () => {
    localStorage.removeItem('gsc_user');
    setUser(null);
    setIsAuthorized(null);
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    const enriched = { ...transaction, user: user?.email || 'unknown', isSynced: false };
    setTransactions(prev => [enriched, ...prev]);
    
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', enriched);
      if (success) {
        setTransactions(prev => prev.map(t => t.id === enriched.id ? { ...t, isSynced: true } : t));
      }
    }
  };

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...updatedTransaction, isSynced: false } : t));
    
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'EDIT_TRANSACTION', updatedTransaction);
      if (success) {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...t, isSynced: true } : t));
      }
    }
  };

  const handleSaveNote = async (newNote: string) => {
    setNotes(newNote);
    localStorage.setItem('gsc_notes', newNote);
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'UPDATE_NOTE', { notes: newNote });
    }
  };

  const handleAddEstablishment = async (establishment: Establishment) => {
    setEstablishments(prev => [...prev, establishment]);
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'ADD_ESTABLISHMENT', establishment);
    }
  };

  const handleUpdateEstablishment = (updatedEstablishment: Establishment) => {
    setEstablishments(prev => prev.map(est => est.id === updatedEstablishment.id ? updatedEstablishment : est));
  };

  if (!user) return <Login onLogin={handleLogin} />;

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Verificando Credenciais</h2>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <AccessDenied email={user.email} onLogout={handleLogout} onRefresh={syncData} />;
  }

  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} 
        isSyncing={isSyncing} 
        lastSync={lastSync} 
        onSync={SHEET_API_URL ? syncData : undefined}
        syncError={syncError}
        user={user}
        onLogout={handleLogout}
        pendingCount={transactions.filter(t => !t.isSynced).length}
      >
        <Routes>
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} notes={notes} onSaveNote={handleSaveNote} />} />
          <Route path="/establishment/:id" element={<EstablishmentDetail establishments={establishments} transactions={transactions} onUpdateTransaction={handleUpdateTransaction} />} />
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route path="/settings" element={<Settings establishments={establishments} onAddEstablishment={handleAddEstablishment} onUpdateEstablishment={handleUpdateEstablishment} darkMode={darkMode} setDarkMode={setDarkMode} />} />
          <Route path="/reports" element={<Reports establishments={establishments} transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
