import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  signupUser,
  googleLoginUser,
  getMe,
  logoutUser,
  demoLogin as demoLoginApi,
  forgotPassword as forgotPasswordApi,
  resetPassword as resetPasswordApi,
  sendVerificationEmail as sendVerificationEmailApi,
  verifyEmail as verifyEmailApi,
  enable2FA as enable2FAApi,
  verify2FA as verify2FAApi,
  verify2FALogin as verify2FALoginApi,
  
  disable2FA as disable2FAApi,
  sendOTP as sendOTPApi,
  registerPasskeyBegin,
  registerPasskeyComplete,
  loginPasskeyBegin,
  loginPasskeyComplete,
  listPasskeyCredentials,
  removePasskeyCredential,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    setToast({ id: Date.now(), message, type, duration });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    // Demo mode: restore user from localStorage, skip DB lookup
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.isDemo) {
        setUser(parsed);
        setLoading(false);
        return;
      }
    }

    try {
      const { data } = await getMe();
      setUser(data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await loginUser(email, password);

    // Handle 2FA requirement
    if (data.requires2FA) {
      return { requires2FA: true, tempToken: data.tempToken, user: { _id: data._id, name: data.name, email: data.email } };
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const signup = async (name, email, password, orgName) => {
    const { data } = await signupUser(name, email, password, orgName);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);

    // Try to send verification email (non-blocking)
    try {
      await sendVerificationEmailApi();
    } catch {
      // Ignore — email verification is optional
    }

    return data;
  };

  const demoLogin = async () => {
    const { data } = await demoLoginApi();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const googleLogin = async (credential) => {
    const { data } = await googleLoginUser(credential);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore server errors during logout — clear locally anyway
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // ─── Password Reset ──────────────────────────────────────────────────
  const forgotPassword = async (email) => {
    const { data } = await forgotPasswordApi(email);
    return data;
  };

  const resetPassword = async (token, password) => {
    const { data } = await resetPasswordApi(token, password);
    return data;
  };

  // ─── Email Verification ──────────────────────────────────────────────
  const sendVerification = async () => {
    const { data } = await sendVerificationEmailApi();
    return data;
  };

  const verifyEmail = async (token) => {
    const { data } = await verifyEmailApi(token);
    if (data.emailVerified && user) {
      setUser((prev) => ({ ...prev, emailVerified: true }));
    }
    return data;
  };

  // ─── Two-Factor Auth ─────────────────────────────────────────────────
  const enable2FA = async () => {
    const { data } = await enable2FAApi();
    return data;
  };

  const verify2FA = async (code) => {
    const { data } = await verify2FAApi(code);
    if (data.twoFactorEnabled && user) {
      setUser((prev) => ({ ...prev, twoFactorEnabled: true }));
    }
    return data;
  };

  const verify2FALogin = async (code, tempToken) => {
    const { data } = await verify2FALoginApi(code, tempToken);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const disable2FA = async (password) => {
    const { data } = await disable2FAApi(password);
    if (!data.twoFactorEnabled && user) {
      setUser((prev) => ({ ...prev, twoFactorEnabled: false }));
    }
    return data;
  };

  const sendOTP = async (tempToken) => {
    const { data } = await sendOTPApi(tempToken);
    return data;
  };

  // ─── Passkey (WebAuthn) ──────────────────────────────────────────────
  const registerPasskey = async () => {
    try {
      const { data: options } = await registerPasskeyBegin();
      // Use the WebAuthn browser API to create credentials
      const credential = await navigator.credentials.create({ publicKey: options });
      const { data: result } = await registerPasskeyComplete(credential);
      return result;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Passkey registration was cancelled');
      }
      throw err;
    }
  };

  const loginWithPasskey = async (email) => {
    try {
      const { data: options } = await loginPasskeyBegin(email);
      // Use the WebAuthn browser API to get credentials
      const credential = await navigator.credentials.get({ publicKey: options });
      const { data: result } = await loginPasskeyComplete(credential);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('user', JSON.stringify(result));
      setUser(result);
      return result;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Passkey authentication was cancelled');
      }
      throw err;
    }
  };

  const getPasskeyCredentials = async () => {
    const { data } = await listPasskeyCredentials();
    return data;
  };

  const deletePasskeyCredential = async (id) => {
    const { data } = await removePasskeyCredential(id);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        toast,
        showToast,
        dismissToast,
        login,
        signup,
        googleLogin,
        demoLogin,
        logout,
        forgotPassword,
        resetPassword,
        sendVerification,
        verifyEmail,
        enable2FA,
        verify2FA,
        verify2FALogin,
        disable2FA,
        sendOTP,
        registerPasskey,
        loginWithPasskey,
        getPasskeyCredentials,
        deletePasskeyCredential,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

