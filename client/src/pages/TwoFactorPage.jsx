import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verify2FALogin, sendOTP } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Get tempToken from location state (passed from LoginPage)
  const tempToken = location.state?.tempToken;

  const handleOTPComplete = useCallback(async (otp) => {
    if (!tempToken) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verify2FALogin(otp, tempToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
      setOtpValue('');
    } finally {
      setLoading(false);
    }
  }, [tempToken, verify2FALogin, navigate]);

  const handleResend = useCallback(async () => {
    if (!tempToken || resendCooldown > 0) return;

    setResendLoading(true);
    setError('');
    try {
      await sendOTP(tempToken);
      setResendCooldown(60);
      // Start countdown
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  }, [tempToken, sendOTP, resendCooldown]);

  if (!tempToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Brand<span style={{ color: 'var(--accent)' }}>OS</span></h1>
          <p className="subtitle">Session expired</p>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
            Your session has expired. Please sign in again.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/login')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1>Brand<span style={{ color: 'var(--accent)' }}>OS</span></h1>
          <p className="subtitle">Two-factor authentication</p>

          <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', textAlign: 'center' }}>
            Enter the 6-digit code from your authenticator app.
          </p>

          {error && <div className="error" role="alert">{error}</div>}

          <div style={{ marginBottom: '24px' }}>
            <OTPInput
              length={6}
              onComplete={handleOTPComplete}
              onValueChange={setOtpValue}
              disabled={loading}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => handleOTPComplete(otpValue)}
            disabled={loading || otpValue.length !== 6}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading ? 'Sending…' :
               resendCooldown > 0 ? `Resend code in ${resendCooldown}s` :
               'Send code via email'}
            </button>
          </div>

          <p className="auth-alt">
            <button
              className="link-button"
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              Back to Sign In
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

