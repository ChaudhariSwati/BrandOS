const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Get or create a nodemailer transporter.
 * Falls back to console logging in development.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // Dev mode: use a dummy transporter that logs instead of sending
    transporter = nodemailer.createTransport({
      name: 'brandos-dev',
      sendmail: true,
      newline: 'unix',
      path: '/dev/null',
    });
  }

  return transporter;
}

/**
 * Send an email.
 * In dev mode, logs the email to console.
 * In production, sends via configured SMTP transport.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, text, html }) {
  const isDev = process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST;

  if (isDev) {
    console.log('═══════════════════════════════════════════');
    console.log('  📧 DEV EMAIL');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text:    ${text}`);
    if (html) console.log(`  HTML:    [${html.length} chars]`);
    console.log('═══════════════════════════════════════════');
    return;
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.SMTP_FROM || '"BrandOS" <noreply@brandos.io>',
    to,
    subject,
    text,
    html,
  });
}

/**
 * Send a password reset email.
 */
async function sendPasswordResetEmail(to, resetToken) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  await sendEmail({
    to,
    subject: 'Reset your BrandOS password',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 3px solid #1a1a1a;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Brand<span style="color: #ff4d4d;">OS</span></h1>
        <p style="color: #888; margin-bottom: 24px;">Reset your password</p>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #ff4d4d; color: white; text-decoration: none; font-weight: 600; border: 3px solid #1a1a1a; margin: 16px 0; box-shadow: 3px 3px 0 #1a1a1a;">Reset Password</a>
        <p style="color: #888; font-size: 13px; margin-top: 16px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BrandOS — Your Brand Studio</p>
      </div>
    `,
  });
}

/**
 * Send an email verification email.
 */
async function sendVerificationEmail(to, verifyToken) {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verifyToken}`;
  await sendEmail({
    to,
    subject: 'Verify your BrandOS email address',
    text: `Welcome to BrandOS! Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 3px solid #1a1a1a;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Brand<span style="color: #ff4d4d;">OS</span></h1>
        <p style="color: #888; margin-bottom: 24px;">Verify your email</p>
        <p>Welcome to BrandOS! Click the button below to verify your email address.</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #ff4d4d; color: white; text-decoration: none; font-weight: 600; border: 3px solid #1a1a1a; margin: 16px 0; box-shadow: 3px 3px 0 #1a1a1a;">Verify Email</a>
        <p style="color: #888; font-size: 13px; margin-top: 16px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BrandOS — Your Brand Studio</p>
      </div>
    `,
  });
}

/**
 * Send a 2FA OTP email.
 */
async function sendOTPEmail(to, otp) {
  await sendEmail({
    to,
    subject: 'Your BrandOS verification code',
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 3px solid #1a1a1a;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Brand<span style="color: #ff4d4d;">OS</span></h1>
        <p style="color: #888; margin-bottom: 24px;">Two-factor authentication</p>
        <p>Your verification code is:</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; text-align: center; padding: 16px; background: #f5f5f5; border: 3px solid #1a1a1a; margin: 16px 0;">${otp}</div>
        <p style="color: #888; font-size: 13px;">This code expires in 10 minutes.</p>
        <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BrandOS — Your Brand Studio</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOTPEmail,
};

