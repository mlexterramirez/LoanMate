import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BorrowersPage from './pages/BorrowersPage';
import LoansPage from './pages/LoansPage';
import PaymentsPage from './pages/PaymentsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/borrowers" element={<PrivateRoute><BorrowersPage /></PrivateRoute>} />
          <Route path="/loans" element={<PrivateRoute><LoansPage /></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;