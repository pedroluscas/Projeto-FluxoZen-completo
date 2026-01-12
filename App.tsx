import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Accounts } from './pages/Accounts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

// Componente interno para consumir o contexto
const AppContent: React.FC = () => {
  const { isAuthenticated, login } = useFinancial();

  return (
    <ToastProvider>
      {isAuthenticated ? (
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      ) : (
        <Login onLogin={login} />
      )}
    </ToastProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <FinancialProvider>
        <AppContent />
      </FinancialProvider>
    </ThemeProvider>
  );
};

export default App;