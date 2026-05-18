import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import AdminPanel from './pages/AdminPanel';
import GroupRoom from './pages/GroupRoom';
import InviteAccept from './pages/InviteAccept';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import HelpModal from './components/HelpModal';
import AuthRedirectHandler from './components/AuthRedirectHandler';
import { useState, useEffect } from 'react';

function App() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Listen for a custom event to open help from anywhere
  useEffect(() => {
    const handleOpenHelp = () => setIsHelpOpen(true);
    window.addEventListener('open-help', handleOpenHelp);
    return () => window.removeEventListener('open-help', handleOpenHelp);
  }, []);

  return (
    <AuthProvider>
      <AuthRedirectHandler />
      <Toaster position="top-center" toastOptions={{
        className: 'glass !bg-surface !text-text !border-white/10 !rounded-xl !shadow-2xl',
        duration: 3000,
      }} />
      
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <div className="min-h-screen bg-background text-text transition-colors duration-300 selection:bg-primary/30 flex flex-col md:flex-row">
        <Navigation />

        <main className="flex-1 overflow-y-auto h-screen w-full relative pb-20 md:pb-0">
          <div className="w-full max-w-7xl mx-auto px-6 py-8 md:px-12 md:py-12">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/invite" element={<InviteAccept />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/group/:id" element={<ProtectedRoute><GroupRoom /></ProtectedRoute>} />

              {/* Admin-only Routes */}
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Routes>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
