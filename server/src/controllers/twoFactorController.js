const User = require('../models/User');
const OTPRecord = require('../models/OTPRecord');
const {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
} = require('../utils/totp');
const { sendOTPEmail } = require('../utils/email');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const cache = require('../utils/cache');

/**
 * POST /api/auth/2fa/enable
 * Generates a TOTP secret and returns QR code URI + backup codes.
 * 2FA is not enabled until verify is called.
 */
const enable2FA = async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ message: 'Two-factor authentication is already enabled' });
  }

  // Generate new TOTP secret
  const secret = generateTOTPSecret();
  user.twoFactorSecret = secret;
  await user.save();

  // Generate QR code and backup codes
  const qrCode = await generateQRCode(secret, user.email);
  const backupCodes = generateBackupCodes();

  // Store hashed backup codes in a temporary place (in production, store hashed)
  // For now, return them so the user can save them
  // In production, you'd store hashed versions and verify against them

  res.json({
    message: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA.',
    secret,
    qrCode,
    backupCodes,
  });
};

/**
 * POST /api/auth/2fa/verify
 * Verifies the initial TOTP code and enables 2FA.
 */
const verify2FA = async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Verification code is required' });
  }

  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ message: 'Two-factor authentication is already enabled' });
  }

  if (!user.twoFactorSecret) {
    return res.status(400).json({ message: 'Please enable 2FA first to get a secret' });
  }

  // Verify TOTP code
  const isValid = verifyTOTP(code, user.twoFactorSecret);

  if (!isValid) {
    return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
  }

  // Enable 2FA
  user.twoFactorEnabled = true;
  await user.save();

  // Invalidate cache
  await cache.del(cache.key('user', user._id.toString()));

  res.json({
    message: 'Two-factor authentication has been enabled successfully.',
    twoFactorEnabled: true,
  });
};

/**
 * POST /api/auth/2fa/verify-login
 * Verifies a 2FA code during login.
 * Accepts either a TOTP code or a backup code.
 */
const verify2FALogin = async (req, res) => {
  const { code, tempToken } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Verification code is required' });
  }

  if (!tempToken || typeof tempToken !== 'string') {
    return res.status(400).json({ message: 'Temporary login token is required' });
  }

  // Verify the temp token and get user ID
  // In production, this would be a signed JWT with short expiry (5 min)
  let userId;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.type !== '2fa_temp') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: 'Invalid or expired temporary token' });
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ message: 'Two-factor authentication is not enabled' });
  }

  // Try TOTP verification
  const isValidTOTP = verifyTOTP(code, user.twoFactorSecret);

  if (isValidTOTP) {
    // Generate final tokens
    const accessToken = generateAccessToken(user);
    const { refreshToken } = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.org,
      accessToken,
    });
  }

  // Try email OTP verification
  const otpRecord = await OTPRecord.findOne({
    userId: user._id,
    type: '2fa_email',
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (otpRecord && otpRecord.verifyOTP(code)) {
    otpRecord.verified = true;
    await otpRecord.save();

    // Generate final tokens
    const accessToken = generateAccessToken(user);
    const { refreshToken } = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.org,
      accessToken,
    });
  }

  // Increment attempts
  if (otpRecord) {
    otpRecord.attempts += 1;
    await otpRecord.save();
  }

  return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
};

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA after verifying the user's password.
 */
const disable2FA = async (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password is required to disable 2FA' });
  }

  const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ message: 'Two-factor authentication is not enabled' });
  }

  // Verify password
  const isValid = await user.matchPassword(password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  await user.save();

  // Invalidate cache
  await cache.del(cache.key('user', user._id.toString()));

  res.json({
    message: 'Two-factor authentication has been disabled.',
    twoFactorEnabled: false,
  });
};

/**
 * POST /api/auth/2fa/send-otp
 * Sends an email OTP for 2FA during login.
 */
const sendOTPHandler = async (req, res) => {
  const { tempToken } = req.body;

  if (!tempToken || typeof tempToken !== 'string') {
    return res.status(400).json({ message: 'Temporary login token is required' });
  }

  let userId;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.type !== '2fa_temp') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: 'Invalid or expired temporary token' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate and send OTP
  const otp = await OTPRecord.generateOTP(user._id, '2fa_email');
  sendOTPEmail(user.email, otp).catch((err) => {
    console.error('Failed to send OTP email:', err.message);
  });

  res.json({
    message: 'A verification code has been sent to your email.',
  });
};

module.exports = {
  enable2FA,
  verify2FA,
  verify2FALogin,
  disable2FA,
  sendOTPHandler,
};

