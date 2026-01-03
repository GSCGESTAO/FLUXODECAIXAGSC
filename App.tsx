
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

// Usuário de bypass para quando a autenticação está desativada
const BYPASS_USER: UserProfile = {
  email: 'admin@gsc.com',
  name: 'Modo Desenvolvedor',
  picture: 'https://ui-avatars.com/api/?name=GSC+Admin&background=4f46e5&color=fff',
  token: 'mock-token'
};

const App: React.FC = () => {
  // Autenticação desativada: inicia com usuário BYPASS
  const [user, setUser] = useState<UserProfile | null>(BYPASS_USER);
  
  // Autorização forçada para true
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(true);
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
      
      // Mantemos autorizado independente da verificação na planilha enquanto a auth estiver off
      setIsAuthorized(true);
      
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

  // Dark mode side effect
  useEffect(() => {
    localStorage.setItem('gsc_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    // No modo bypass, logout apenas reseta para o usuário bypass ou você pode optar por manter logado
    console.log("Logout desativado no modo bypass");
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

  // Renderização principal sem bloqueios de login
  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} 
        isSyncing={isSyncing} 
        lastSync={lastSync} 
        onSync={SHEET_API_URL ? syncData : undefined}
        syncError={syncError}
        user={user!}
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
          <Route path="/new" element={<TransactionForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user!.email} />} />
          <Route path="/transfer" element={<TransferForm establishments={establishments} onSave={handleSaveTransaction} userEmail={user!.email} />} />
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
