import { useRef, useEffect } from 'react';

export default function GoogleButton({ onSuccess, onError, loading, disabled, text = 'signin_with' }) {
  const buttonRef = useRef(null);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;

    // Load Google Identity Services script if not already loaded
    if (!window.google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGIS;
      document.head.appendChild(script);
      return () => {
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) existing.remove();
      };
    } else {
      initializeGIS();
    }

    function initializeGIS() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onSuccess?.(response.credential);
            } else {
              onError?.(new Error('Google sign-in failed'));
            }
          },
          cancel_on_tap_outside: true,
        });
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            shape: 'rectangular',
            theme: 'outline',
            text,
            size: 'large',
            width: '320',
            logo_alignment: 'left',
          });
        }
      }
    }
  }, [GOOGLE_CLIENT_ID, onSuccess, onError, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        ref={buttonRef}
        className={`google-btn ${loading || disabled ? 'google-btn-disabled' : ''}`}
        style={loading || disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}
      />
      {loading && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '8px' }}>
          Continuing with Google…
        </p>
      )}
    </div>
  );
}

