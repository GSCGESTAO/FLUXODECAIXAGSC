
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>(localStorage.getItem('gsc_general_notes') || '');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gsc_dark_mode') === 'true');

  const syncData = useCallback(async () => {
    if (!SHEET_API_URL) {
      setIsAuthorized(true);
      return;
    }

    setIsSyncing(true);
    setSyncError(false);
    
    try {
      // 1. PUSH PENDING DATA
      const pendingTransactions = transactions.filter(t => t.isSynced === false);
      for (const t of pendingTransactions) {
        await postToSheet(SHEET_API_URL, 'ADD_TRANSACTION', t);
      }

      // 2. FETCH LATEST DATA
      const data = await fetchSheetData(SHEET_API_URL);
      if (data) {
        setEstablishments(data.establishments);
        setTransactions(data.transactions.map(t => ({ ...t, isSynced: true })));
        setAuthorizedUsers(data.authorizedUsers);
        
        // Se houver uma nota vinda do servidor, poderíamos carregar aqui
        // Por ora, mantemos local e apenas enviamos ao salvar
        
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
    // Atualiza localmente
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...updatedTransaction, isSynced: false } : t));
    
    // Envia para a planilha
    if (SHEET_API_URL) {
      const success = await postToSheet(SHEET_API_URL, 'EDIT_TRANSACTION', updatedTransaction);
      if (success) {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? { ...t, isSynced: true } : t));
      }
    }
  };

  const handleSaveNote = async (note: string) => {
    setGeneralNotes(note);
    localStorage.setItem('gsc_general_notes', note);
    if (SHEET_API_URL) {
      await postToSheet(SHEET_API_URL, 'UPDATE_NOTE', { note, user: user?.email });
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
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} notes={generalNotes} onSaveNote={handleSaveNote} />} />
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
