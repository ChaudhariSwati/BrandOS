import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import GoogleButton from '../components/auth/GoogleButton';
import PasskeyButton from '../components/auth/PasskeyButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin, demoLogin, loginWithPasskey, showToast } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim().toLowerCase(), password);

      // Check if 2FA is required
      if (result?.requires2FA) {
        navigate('/2fa', { state: { tempToken: result.tempToken } });
        return;
      }

      showToast('Signed in successfully!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setGoogleLoading(true);
    setError('');
    try {
      await googleLogin(credential);
      showToast('Signed in with Google!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setError(err?.message || 'Google sign-in failed');
  };

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      await loginWithPasskey(email || undefined);
      showToast('Signed in with passkey!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Passkey sign-in failed');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await demoLogin();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed');
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Brand<span style={{ color: 'var(--accent)' }}>OS</span>
          </motion.h1>
          <p className="subtitle">Sign in to your brand studio</p>

          {error && (
            <motion.div
              className="error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          {/* Google Sign-In */}
          <div style={{ marginBottom: '12px' }}>
            <GoogleButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              loading={googleLoading}
              disabled={loading || demoLoading}
              text="signin_with"
            />
          </div>

          {/* Passkey Sign-In */}
          <div style={{ marginBottom: '12px' }}>
            <PasskeyButton
              onLogin={handlePasskeyLogin}
              loading={passkeyLoading}
              disabled={loading || demoLoading || googleLoading}
              mode="login"
            />
          </div>

          <div className="auth-divider"><span>or sign in with email</span></div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                disabled={loading || demoLoading}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="login-password">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                  Forgot?
                </Link>
              </div>
              <div className="password-input-wrap">
                <input
                  id="login-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading || demoLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading || demoLoading}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
              />
              <label htmlFor="remember-me" style={{ fontSize: '13px', cursor: 'pointer' }}>Remember me</label>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading || demoLoading || googleLoading}
              type="submit"
            >
              {loading ? (
                <span className="btn-loading-spinner" />
              ) : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <button
            className="btn btn-demo"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleDemo}
            disabled={demoLoading || loading}
          >
            {demoLoading ? 'Loading demo…' : '🚀 Try Demo'}
          </button>

          <p className="auth-alt">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

