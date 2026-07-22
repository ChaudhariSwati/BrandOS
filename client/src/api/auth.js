import api from './client';

// ─── Email/Password Auth ───────────────────────────────────────────────
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const signupUser = (name, email, password, orgName) =>
  api.post('/auth/signup', { name, email, password, orgName });
export const googleLoginUser = (credential) => api.post('/auth/google', { credential });

// ─── Token & Session ───────────────────────────────────────────────────
export const getMe = () => api.get('/auth/me');
export const logoutUser = () => api.post('/auth/logout');
export const refreshToken = () => api.post('/auth/refresh');
export const demoLogin = () => api.post('/demo/login');

// ─── Password Reset ────────────────────────────────────────────────────
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });

// ─── Email Verification ────────────────────────────────────────────────
export const sendVerificationEmail = () => api.post('/auth/send-verification');
export const verifyEmail = (token) => api.post('/auth/verify-email', { token });

// ─── Two-Factor Auth ───────────────────────────────────────────────────
export const enable2FA = () => api.post('/auth/2fa/enable');
export const verify2FA = (code) => api.post('/auth/2fa/verify', { code });
export const verify2FALogin = (code, tempToken) => api.post('/auth/2fa/verify-login', { code, tempToken });
export const disable2FA = (password) => api.post('/auth/2fa/disable', { password });
export const sendOTP = (tempToken) => api.post('/auth/2fa/send-otp', { tempToken });

// ─── Passkey (WebAuthn) ────────────────────────────────────────────────
export const registerPasskeyBegin = () => api.post('/auth/passkey/register-begin');
export const registerPasskeyComplete = (response, deviceName) =>
  api.post('/auth/passkey/register-complete', { response, deviceName });
export const loginPasskeyBegin = (email) => api.post('/auth/passkey/login-begin', { email });
export const loginPasskeyComplete = (response) => api.post('/auth/passkey/login-complete', { response });
export const listPasskeyCredentials = () => api.get('/auth/passkey/credentials');
export const removePasskeyCredential = (id) => api.delete(`/auth/passkey/credentials/${id}`);

