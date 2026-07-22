import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Toast from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import TwoFactorPage from './pages/TwoFactorPage';
import Dashboard from './pages/Dashboard';
import BrandKits from './pages/BrandKits';
import BrandKitEditor from './pages/BrandKitEditor';
import Assets from './pages/Assets';
import CardEditor from './pages/CardEditor';
import LetterheadEditor from './pages/LetterheadEditor';
import InvoiceEditor from './pages/InvoiceEditor';
import OrgDashboard from './pages/OrgDashboard';

function ProtectedRoute({ children, requireVerified = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading, toast, dismissToast } = useAuth();

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      {/* Global toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={dismissToast}
        />
      )}

      <AnimatePresence mode="wait">
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />

          {/* Protected app routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="brandkits" element={<BrandKits />} />
            <Route path="brandkits/new" element={<BrandKitEditor />} />
            <Route path="brandkits/:id" element={<BrandKitEditor />} />
            <Route path="assets" element={<Assets />} />
            <Route path="assets/card/new" element={<CardEditor />} />
            <Route path="assets/card/:id" element={<CardEditor />} />
            <Route path="assets/letterhead/new" element={<LetterheadEditor />} />
            <Route path="assets/letterhead/:id" element={<LetterheadEditor />} />
            <Route path="assets/invoice/new" element={<InvoiceEditor />} />
            <Route path="assets/invoice/:id" element={<InvoiceEditor />} />
            <Route path="org" element={<OrgDashboard />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}

