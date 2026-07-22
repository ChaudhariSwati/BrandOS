const { authenticator } = require('otplib');
const QRCode = require('qrcode');

/**
 * Generate a new TOTP secret for a user.
 * @returns {string} The base32-encoded secret
 */
function generateTOTPSecret() {
  return authenticator.generateSecret();
}

/**
 * Generate a TOTP token using a secret (for verification).
 * @param {string} secret
 * @returns {string} The 6-digit token
 */
function generateTOTPToken(secret) {
  return authenticator.generate(secret);
}

/**
 * Verify a TOTP token against a secret.
 * @param {string} token - The 6-digit code from the authenticator app
 * @param {string} secret - The user's TOTP secret
 * @returns {boolean}
 */
function verifyTOTP(token, secret) {
  try {
    return authenticator.check(token, secret);
  } catch {
    return false;
  }
}

/**
 * Generate a QR code data URL for setting up an authenticator app.
 * @param {string} secret - The TOTP secret
 * @param {string} email - User's email (used as label in authenticator app)
 * @param {string} [issuer='BrandOS'] - The app name shown in authenticator app
 * @returns {Promise<string>} Data URL of the QR code
 */
async function generateQRCode(secret, email, issuer = 'BrandOS') {
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#fafafa',
    },
  });
}

/**
 * Generate backup codes for emergency access.
 * @param {number} [count=8] - Number of backup codes to generate
 * @returns {string[]} Array of backup codes
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 10; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXXX-XXXXX
    codes.push(code.slice(0, 5) + '-' + code.slice(5));
  }
  return codes;
}

module.exports = {
  generateTOTPSecret,
  generateTOTPToken,
  verifyTOTP,
  generateQRCode,
  generateBackupCodes,
};

