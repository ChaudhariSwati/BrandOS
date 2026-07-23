import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { forgotPassword as forgotPasswordApi, getDevEmails } from '../api/auth';
import SuccessCard from '../components/ui/SuccessCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // ─── Dev mailbox state ───────────────────────────────────────────────
  const [devInboxOpen, setDevInboxOpen] = useState(false);
  const [devEmails, setDevEmails] = useState([]);
  const [devLoading, setDevLoading] = useState(false);

  const fetchDevEmails = async () => {
    setDevLoading(true);
    try {
      const { data } = await getDevEmails();
      setDevEmails(data.emails || []);
    } catch {
      setDevEmails([]);
    } finally {
      setDevLoading(false);
    }
  };

  useEffect(() => {
    if (devInboxOpen) fetchDevEmails();
  }, [devInboxOpen]);

  // ─────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await forgotPasswordApi(trimmedEmail);
      setSent(true);
    } catch (err) {
      // Always show generic success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  // Extract reset URL from email text
  const extractResetUrl = (text) => {
    const match = text.match(/https?:\/\/[^\s]+reset-password\/[^\s]+/);
    return match ? match[0] : null;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SuccessCard
                title="Check your email"
                description="If an account exists with that email, we've sent a password reset link. Please check your inbox and follow the instructions."
                actionLabel="Back to Sign In"
                onAction={() => window.location.href = '/login'}
                secondaryLabel="Send again"
                onSecondary={() => setSent(false)}
              />

              {/* Dev mailbox toggle */}
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  onClick={() => setDevInboxOpen(!devInboxOpen)}
                  style={{
                    background: 'none',
                    border: '2px dashed #555',
                    color: '#888',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                  }}
                >
                  {devInboxOpen ? '− Close Dev Mail Inbox' : '+ Dev Mail Inbox (local only)'}
                </button>
              </div>

              {devInboxOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#1a1a1a',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ color: '#ff4d4d', fontSize: '13px' }}>📬 Dev Mail Inbox</strong>
                    <button
                      onClick={fetchDevEmails}
                      style={{
                        background: 'none',
                        border: '1px solid #555',
                        color: '#aaa',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'inherit',
                      }}
                    >
                      {devLoading ? '⟳' : '↻ Refresh'}
                    </button>
                  </div>

                  {devEmails.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                      {devLoading ? 'Loading…' : 'No emails captured yet. Send a reset request first.'}
                    </p>
                  ) : (
                    devEmails.map((mail) => {
                      const resetUrl = extractResetUrl(mail.text);
                      return (
                        <div
                          key={mail.id}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            background: '#252525',
                            borderRadius: '6px',
                            border: '1px solid #333',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                            To: <span style={{ color: '#aaa' }}>{mail.to}</span>
                            {' · '}
                            {new Date(mail.sentAt).toLocaleTimeString()}
                          </div>
                          <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '4px' }}>
                            {mail.subject}
                          </div>
                          {resetUrl ? (
                            <a
                              href={resetUrl}
                              style={{
                                display: 'inline-block',
                                fontSize: '12px',
                                color: '#ff4d4d',
                                wordBreak: 'break-all',
                                marginTop: '4px',
                              }}
                            >
                              🔗 {resetUrl}
                            </a>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                              {mail.text?.slice(0, 200)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Brand<span style={{ color: 'var(--accent)' }}>OS</span>
              </motion.h1>
              <p className="subtitle">Reset your password</p>

              {error && <div className="error" role="alert">{error}</div>}

              <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <span className="btn-loading-spinner" />
                  ) : null}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="auth-alt">
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

