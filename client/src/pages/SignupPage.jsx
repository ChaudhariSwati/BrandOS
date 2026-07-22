import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import GoogleButton from '../components/auth/GoogleButton';
import PasswordStrengthIndicator from '../components/auth/PasswordStrengthIndicator';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, googleLogin, demoLogin, showToast } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!acceptTerms) return 'Please accept the Terms of Service and Privacy Policy';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password, orgName.trim() || undefined);
      showToast('Account created! Check your email for verification.', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed';
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
      showToast('Account created with Google!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setError(err?.message || 'Google sign-up failed');
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
          <p className="subtitle">Create your brand studio</p>

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

          {/* Google Sign-Up */}
          <div style={{ marginBottom: '16px' }}>
            <GoogleButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              loading={googleLoading}
              disabled={loading || demoLoading}
              text="signup_with"
            />
          </div>

          <div className="auth-divider"><span>or sign up with email</span></div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
                autoFocus
                disabled={loading || demoLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={loading || demoLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="signup-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
              <div className="password-input-wrap">
                <input
                  id="signup-confirm"
                  className="form-input"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading || demoLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                  disabled={loading || demoLoading}
                >
                  {showConfirm ? (
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
              {confirmPassword && password !== confirmPassword && (
                <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '4px' }}>
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-org">Organization Name (optional)</label>
              <input
                id="signup-org"
                className="form-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="My Brand Studio"
                disabled={loading || demoLoading}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                id="accept-terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--accent)' }}
                disabled={loading || demoLoading}
              />
              <label htmlFor="accept-terms" style={{ fontSize: '12px', color: '#888', cursor: 'pointer' }}>
                I accept the <a href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Terms of Service</a> and{' '}
                <a href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
              </label>
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
              {loading ? 'Creating account…' : 'Create Account'}
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
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

