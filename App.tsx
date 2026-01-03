
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
import { fetchSheetData, postTransactionToSheet } from './services/sheetService';

const App: React.FC = () => {
  // Restore user from localStorage
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('gsc_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Authorization State
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);

  // Data State
  const [establishments, setEstablishments] = useState<Establishment[]>(MOCK_ESTABLISHMENTS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  
  // Integration State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('gsc_dark_mode') === 'true';
  });

  // Sync Function
  const syncData = useCallback(async () => {
    if (!SHEET_API_URL) return;

    setIsSyncing(true);
    setSyncError(false);
    
    const data = await fetchSheetData(SHEET_API_URL);
    if (data) {
      setEstablishments(data.establishments);
      setTransactions(data.transactions);
      setAuthorizedUsers(data.authorizedUsers);
      setLastSync(new Date());
    } else {
      setSyncError(true);
    }
    setIsSyncing(false);
  }, []);

  // Initial Sync
  useEffect(() => {
    syncData();
  }, [syncData]);

  // Authorization Check Logic
  useEffect(() => {
    if (user && authorizedUsers.length > 0) {
      const isUserInList = authorizedUsers.some(
        u => u.email.toLowerCase() === user.email.toLowerCase()
      );
      setIsAuthorized(isUserInList);
    } else if (user && authorizedUsers.length === 0 && !isSyncing && lastSync) {
      // If sync finished and list is still empty, and we have a user
      setIsAuthorized(false);
    }
  }, [user, authorizedUsers, isSyncing, lastSync]);

  // Dark mode side effect
  useEffect(() => {
    localStorage.setItem('gsc_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleLogin = (newUser: UserProfile) => {
    localStorage.setItem('gsc_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('gsc_user');
    setUser(null);
    setIsAuthorized(null);
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    const enrichedTransaction = { ...transaction, user: user?.email || 'unknown' };
    setTransactions(prev => [enrichedTransaction, ...prev]);
    
    if (SHEET_API_URL) {
      await postTransactionToSheet(SHEET_API_URL, enrichedTransaction);
    }
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
  };

  const handleAddEstablishment = (establishment: Establishment) => {
    setEstablishments(prev => [...prev, establishment]);
  };

  const handleUpdateEstablishment = (updatedEstablishment: Establishment) => {
    setEstablishments(prev => 
      prev.map(est => est.id === updatedEstablishment.id ? updatedEstablishment : est)
    );
  };

  // 1. If not logged in, show Login Screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. If logged in but not yet checked authorization or syncing first time
  if (isAuthorized === null && isSyncing && !lastSync) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // 3. If logged in but NOT authorized
  if (isAuthorized === false) {
    return <AccessDenied email={user.email} onLogout={handleLogout} />;
  }

  // 4. Authorized Access
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
      >
        <Routes>
          <Route path="/" element={<Dashboard establishments={establishments} transactions={transactions} />} />
          <Route 
            path="/establishment/:id" 
            element={<EstablishmentDetail 
              establishments={establishments} 
              transactions={transactions} 
              onUpdateTransaction={handleUpdateTransaction}
            />} 
          />
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user.email} />} />
          <Route 
            path="/settings" 
            element={
              <Settings 
                establishments={establishments} 
                onAddEstablishment={handleAddEstablishment} 
                onUpdateEstablishment={handleUpdateEstablishment}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            } 
          />
          <Route path="/reports" element={<Reports establishments={establishments} transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
