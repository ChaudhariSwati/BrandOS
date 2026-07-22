const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail } = require('../utils/email');
const { generateAccessToken, generateRefreshToken, revokeAllUserTokens } = require('../utils/tokenUtils');
const cache = require('../utils/cache');

/**
 * POST /api/auth/forgot-password
 * Always returns a generic success message regardless of whether the email exists.
 * This prevents email enumeration attacks.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Always respond with success to prevent email enumeration
  const genericResponse = {
    message: 'If an account exists with this email, a password reset link has been sent.',
  };

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.provider !== 'local') {
      return res.json(genericResponse);
    }

    // Generate reset token
    const resetToken = await PasswordResetToken.generateToken(normalizedEmail);

    // Send email (async — don't wait for it)
    sendPasswordResetEmail(normalizedEmail, resetToken).catch((err) => {
      console.error('Failed to send password reset email:', err.message);
    });

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return res.json(genericResponse);
  }
};

/**
 * POST /api/auth/reset-password
 * Validates the reset token and sets a new password.
 * Increments tokenVersion to invalidate all existing sessions.
 */
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Reset token is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'New password is required' });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain an uppercase letter' });
  }

  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain a lowercase letter' });
  }

  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain a number' });
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain a special character' });
  }

  // Find valid token
  const resetTokenDoc = await PasswordResetToken.findValidToken(token);

  if (!resetTokenDoc) {
    return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new one.' });
  }

  // Find user by email
  const user = await User.findOne({ email: resetTokenDoc.email }).select('+password');
  if (!user) {
    return res.status(400).json({ message: 'User no longer exists' });
  }

  // Update password and increment token version (revokes all sessions)
  user.password = password;
  user.tokenVersion += 1;
  user.rememberMeToken = null; // Clear any remember me token
  await user.save();

  // Mark token as used
  resetTokenDoc.used = true;
  await resetTokenDoc.save();

  // Invalidate cache
  await cache.del(cache.key('user', user._id.toString()));

  // Revoke all refresh tokens for this user via tokenVersion
  // The auth middleware will check tokenVersion from JWT against the user's stored version

  res.json({
    message: 'Password has been reset successfully. You can now sign in with your new password.',
  });
};

module.exports = { forgotPassword, resetPassword };

