import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyEmail as verifyEmailApi, sendVerificationEmail } from '../api/auth';
import SuccessCard from '../components/ui/SuccessCard';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'already-verified'
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await verifyEmailApi(token);
        if (data.emailVerified || data.message?.includes('already verified')) {
          setStatus('already-verified');
        } else {
          setStatus('success');
        }
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Verification failed. The link may be expired.');
      }
    };

    // Small delay for animation
    const timer = setTimeout(verify, 500);
    return () => clearTimeout(timer);
  }, [token]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      await sendVerificationEmail();
      setResendMessage('Verification email sent! Please check your inbox.');
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification email.';
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 60;
        setResendCooldown(retryAfter);
        setResendMessage(`Please wait ${retryAfter} seconds before trying again.`);
      } else {
        setResendMessage(msg);
      }
    } finally {
      setResendLoading(false);
    }
  }, [resendCooldown]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AnimatePresence mode="wait">
          {status === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="loading" style={{ padding: '40px 0' }}>
                <div className="spinner" />
                <p>Verifying your email…</p>
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <SuccessCard
                title="Email verified!"
                description="Your email has been successfully verified. You can now access all features."
                actionLabel="Go to Dashboard"
                onAction={() => window.location.href = '/'}
              />
            </motion.div>
          )}

          {status === 'already-verified' && (
            <motion.div
              key="already"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SuccessCard
                title="Already verified"
                description="Your email was already verified. You're all set!"
                actionLabel="Go to Dashboard"
                onAction={() => window.location.href = '/'}
              />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1>Brand<span style={{ color: 'var(--accent)' }}>OS</span></h1>
              <p className="subtitle">Verification failed</p>

              {error && <div className="error" role="alert">{error}</div>}

              {resendMessage && (
                <div className="success-message" role="status">{resendMessage}</div>
              )}

              <div style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleResend}
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading ? 'Sending…' :
                   resendCooldown > 0 ? `Resend in ${resendCooldown}s` :
                   'Resend Verification Email'}
                </button>
              </div>

              <p className="auth-alt">
                <Link to="/login">Back to Sign In</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

