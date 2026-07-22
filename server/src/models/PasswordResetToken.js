const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true,
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required'],
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a reset token
passwordResetTokenSchema.statics.generateToken = async function (email) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  await this.create({
    email,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return rawToken;
};

// Static method to find a valid token
passwordResetTokenSchema.statics.findValidToken = async function (rawToken) {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return this.findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
    used: false,
  });
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

