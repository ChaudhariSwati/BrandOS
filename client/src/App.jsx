import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from '../../.continue/agents/Dashboard';
import BrandKits from './pages/BrandKits';
import BrandKitEditor from './pages/BrandKitEditor';
import Assets from './pages/Assets';
import CardEditor from './pages/CardEditor';
import LetterheadEditor from './pages/LetterheadEditor';
import InvoiceEditor from './pages/InvoiceEditor';
import OrgDashboard from './pages/OrgDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
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
  );
}
