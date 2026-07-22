import { useState, useEffect } from 'react';

export default function PasskeyButton({ onRegister, onLogin, loading, disabled, mode = 'login' }) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if WebAuthn is available
    const isSupported =
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined';
    setSupported(isSupported);
  }, []);

  if (!supported) {
    return (
      <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '8px' }}>
        Passkeys are not supported on this browser. Use a different sign-in method.
      </p>
    );
  }

  const handleClick = async () => {
    if (mode === 'login') {
      await onLogin?.();
    } else {
      await onRegister?.();
    }
  };

  return (
    <button
      className="btn btn-passkey"
      onClick={handleClick}
      disabled={disabled || loading}
      style={{ width: '100%', justifyContent: 'center' }}
      type="button"
      aria-label={mode === 'login' ? 'Sign in with passkey' : 'Register a passkey'}
    >
      {loading ? (
        <span>Verifying…</span>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          {mode === 'login' ? 'Sign in with Passkey' : 'Register Passkey'}
        </>
      )}
    </button>
  );
}

