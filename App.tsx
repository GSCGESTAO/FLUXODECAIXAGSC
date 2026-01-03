
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
  // User State: Tenta recuperar do localStorage ou inicia nulo
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('gsc_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Whitelist State
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
      
      // Verify authorization
      if (user) {
        const check = data.authorizedUsers.some(au => au.email.toLowerCase() === user.email.toLowerCase());
        setIsAuthorized(check);
      }
      
      setLastSync(new Date());
    } else {
      setSyncError(true);
    }
    setIsSyncing(false);
  }, [user]);

  // Initial Sync
  useEffect(() => {
    if (user) {
      syncData();
    }
  }, [user, syncData]);

  // Dark mode side effect
  useEffect(() => {
    localStorage.setItem('gsc_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('gsc_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthorized(null);
    localStorage.removeItem('gsc_user');
    window.location.href = "/"; // Força recarregamento para limpar estados
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

  // 1. Se não houver usuário, mostra Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Se houver usuário mas não autorizado (e a verificação já rodou), mostra Acesso Negado
  // Nota: isAuthorized === null significa "verificando..."
  if (isAuthorized === false) {
    return <AccessDenied email={user.email} onLogout={handleLogout} />;
  }

  // 3. App Principal
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
