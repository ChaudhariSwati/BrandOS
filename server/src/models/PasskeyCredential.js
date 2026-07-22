const mongoose = require('mongoose');

const passkeyCredentialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  credentialId: {
    type: String,
    required: [true, 'Credential ID is required'],
    unique: true,
  },
  publicKey: {
    type: String,
    required: [true, 'Public key is required'],
  },
  counter: {
    type: Number,
    default: 0,
  },
  deviceName: {
    type: String,
    default: 'Unknown Device',
  },
  transports: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

passkeyCredentialSchema.index({ userId: 1, credentialId: 1 });

module.exports = mongoose.model('PasskeyCredential', passkeyCredentialSchema);

