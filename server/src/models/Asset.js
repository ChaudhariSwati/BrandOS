const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    brandKit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandKit',
      required: true,
    },
    type: {
      type: String,
      enum: ['card', 'letterhead', 'invoice'],
      required: true,
    },
    name: {
      type: String,
      default: function () {
        return `Untitled ${this.type}`;
      },
    },
    // Fabric.js canvas JSON (objects, positions, text, etc.)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    exportUrl: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
