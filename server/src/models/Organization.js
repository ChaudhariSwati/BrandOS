const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tier: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    activeBrandKit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandKit',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
