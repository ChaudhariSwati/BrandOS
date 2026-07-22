const User = require('../models/User');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { sendVerificationEmail } = require('../utils/email');

/**
 * POST /api/auth/send-verification
 * Sends a verification email to the authenticated user.
 * Resend is rate-limited to once per 60 seconds.
 */
const sendVerificationEmailHandler = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.emailVerified) {
    return res.status(400).json({ message: 'Email is already verified' });
  }

  // Check if a token was sent recently (prevent abuse — 60 second cooldown)
  const recentToken = await EmailVerificationToken.findOne({
    userId: user._id,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });

  if (recentToken) {
    const retryAfter = Math.ceil(
      (recentToken.createdAt.getTime() + 60000 - Date.now()) / 1000
    );
    return res.status(429).json({
      message: `Please wait ${retryAfter} seconds before requesting another verification email`,
      retryAfter,
    });
  }

  // Invalidate old tokens
  await EmailVerificationToken.updateMany(
    { userId: user._id, used: false },
    { $set: { used: true } }
  );

  // Generate new token
  const verifyToken = await EmailVerificationToken.generateToken(user._id);

  // Send verification email (async)
  sendVerificationEmail(user.email, verifyToken).catch((err) => {
    console.error('Failed to send verification email:', err.message);
  });

  res.json({
    message: 'Verification email sent. Please check your inbox.',
  });
};

/**
 * POST /api/auth/verify-email
 * Verifies a user's email using the token from the email link.
 */
const verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  // Find valid token
  const verificationTokenDoc = await EmailVerificationToken.findValidToken(token);

  if (!verificationTokenDoc) {
    return res.status(400).json({
      message: 'Invalid or expired verification token. Please request a new verification email.',
    });
  }

  const user = verificationTokenDoc.userId;

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.emailVerified) {
    // Token is still valid but email is already verified — clean up and return success
    verificationTokenDoc.used = true;
    await verificationTokenDoc.save();
    return res.json({ message: 'Email is already verified. You can sign in.' });
  }

  // Mark email as verified
  user.emailVerified = true;
  await user.save();

  // Mark token as used
  verificationTokenDoc.used = true;
  await verificationTokenDoc.save();

  res.json({
    message: 'Email verified successfully! You can now access all features.',
    emailVerified: true,
  });
};

module.exports = { sendVerificationEmailHandler, verifyEmail };

