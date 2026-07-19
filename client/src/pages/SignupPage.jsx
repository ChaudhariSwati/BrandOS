import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup, demoLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password, orgName);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed');
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Brand<span style={{ color: 'var(--accent)' }}>OS</span></h1>
        <p className="subtitle">Create your brand studio</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="My Brand Studio" />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="btn btn-demo" style={{ width: '100%' }} onClick={handleDemo} disabled={demoLoading}>
          {demoLoading ? 'Loading demo…' : '🚀 Try Demo'}
        </button>
        <p className="auth-alt">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
