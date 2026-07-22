const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  googleAuth,
  refresh,
  logout,
  getMe,
} = require('../controllers/authController');
const {
  forgotPassword,
  resetPassword,
} = require('../controllers/resetPasswordController');
const {
  sendVerificationEmailHandler,
  verifyEmail,
} = require('../controllers/emailVerificationController');
const {
  enable2FA,
  verify2FA,
  verify2FALogin,
  disable2FA,
  sendOTPHandler,
} = require('../controllers/twoFactorController');
const {
  registerPasskeyBegin,
  registerPasskeyComplete,
  loginPasskeyBegin,
  loginPasskeyComplete,
  listPasskeyCredentials,
  removePasskeyCredential,
} = require('../controllers/passkeyController');
const {
  protect,
  checkEmailVerified,
  check2FARequired,
} = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// ─── Email/Password Auth ────────────────────────────────────────────────
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);

// ─── Google OAuth ───────────────────────────────────────────────────────
router.post('/google', googleAuth);

// ─── Token Management ───────────────────────────────────────────────────
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

// ─── Profile ────────────────────────────────────────────────────────────
router.get('/me', protect, getMe);

// ─── Password Reset ─────────────────────────────────────────────────────
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// ─── Email Verification ─────────────────────────────────────────────────
router.post('/send-verification', protect, sendVerificationEmailHandler);
router.post('/verify-email', verifyEmail);

// ─── Two-Factor Authentication ──────────────────────────────────────────
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/verify-login', authLimiter, verify2FALogin);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/send-otp', authLimiter, sendOTPHandler);

// ─── Passkey (WebAuthn) ─────────────────────────────────────────────────
router.post('/passkey/register-begin', protect, registerPasskeyBegin);
router.post('/passkey/register-complete', protect, registerPasskeyComplete);
router.post('/passkey/login-begin', loginPasskeyBegin);
router.post('/passkey/login-complete', loginPasskeyComplete);
router.get('/passkey/credentials', protect, listPasskeyCredentials);
router.delete('/passkey/credentials/:id', protect, removePasskeyCredential);

module.exports = router;

