const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    githubId: {
      type: String,
      default: null,
      index: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    twoFactorSecret: {
      type: String,
      select: false,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    rememberMeToken: {
      type: String,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast lookups
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.rememberMeToken;
  delete obj.tokenVersion;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

