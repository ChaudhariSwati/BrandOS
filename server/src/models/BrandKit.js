const mongoose = require('mongoose');

const brandKitSchema = new mongoose.Schema(
  {
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      default: 'Default Brand Kit',
      trim: true,
    },
    colors: {
      type: [String], // hex codes e.g. "#1A2B3C"
      default: [],
      validate: {
        validator: (arr) => arr.every((c) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(c)),
        message: 'Colors must be valid hex codes',
      },
    },
    fonts: {
      heading: { type: String, default: 'Poppins' },
      body: { type: String, default: 'Inter' },
    },
    logoUrl: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BrandKit', brandKitSchema);
