const mongoose = require('mongoose');
const crypto = require('crypto');

const otpRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
  },
  type: {
    type: String,
    enum: ['2fa_email', '2fa_app'],
    required: [true, 'OTP type is required'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required'],
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired OTPs
otpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate an OTP
otpRecordSchema.statics.generateOTP = async function (userId, type) {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  // Invalidate previous OTPs for this user + type
  await this.updateMany(
    { userId, type, verified: false },
    { $set: { expiresAt: new Date() } }
  );

  await this.create({
    userId,
    otp: hashedOTP,
    type,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  return otp; // Return the plain OTP for sending
};

// Instance method to verify OTP
otpRecordSchema.methods.verifyOTP = function (plainOTP) {
  const hashed = crypto.createHash('sha256').update(plainOTP).digest('hex');
  return this.otp === hashed;
};

module.exports = mongoose.model('OTPRecord', otpRecordSchema);

