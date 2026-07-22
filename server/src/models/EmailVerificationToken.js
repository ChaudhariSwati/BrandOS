const mongoose = require('mongoose');
const crypto = require('crypto');

const emailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
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
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a verification token
emailVerificationTokenSchema.statics.generateToken = async function (userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  await this.create({
    userId,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  return rawToken;
};

// Static method to find a valid token
emailVerificationTokenSchema.statics.findValidToken = async function (rawToken) {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return this.findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
    used: false,
  }).populate('userId');
};

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

