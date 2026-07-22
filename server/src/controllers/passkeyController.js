require('express-async-errors');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const PasskeyCredential = require('../models/PasskeyCredential');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

// WebAuthn configuration
const RP_NAME = 'BrandOS';
const RP_ID = process.env.DOMAIN || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

/**
 * POST /api/auth/passkey/register-begin
 * Generates WebAuthn registration options for the authenticated user.
 */
const registerPasskeyBegin = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Get existing credentials for this user (to exclude them)
  const existingCredentials = await PasskeyCredential.find({ userId: user._id });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name,
    timeout: 60000,
    attestationType: 'none',
    // Prevent registering the same credential multiple times
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store the challenge in the user session (use a temp in-memory store or DB)
  // For simplicity, store in the user document. In production, use Redis/session.
  user.rememberMeToken = options.challenge; // Reusing field as challenge storage
  await user.save();

  res.json(options);
};

/**
 * POST /api/auth/passkey/register-complete
 * Validates and stores the new WebAuthn credential.
 */
const registerPasskeyComplete = async (req, res) => {
  const { response, deviceName } = req.body;

  if (!response) {
    return res.status(400).json({ message: 'Registration response is required' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const expectedChallenge = user.rememberMeToken;
  if (!expectedChallenge) {
    return res.status(400).json({ message: 'No registration in progress. Please start again.' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return res.status(400).json({ message: 'Passkey registration verification failed' });
    }

    const { registrationInfo } = verification;

    // Store the credential
    await PasskeyCredential.create({
      userId: user._id,
      credentialId: registrationInfo.credentialID,
      publicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64'),
      counter: registrationInfo.counter,
      deviceName: deviceName || 'Unknown Device',
      transports: response.response?.transports || [],
    });

    // Clear the challenge
    user.rememberMeToken = null;
    await user.save();

    res.json({
      message: 'Passkey registered successfully',
      verified: true,
    });
  } catch (err) {
    return res.status(400).json({ message: 'Passkey registration failed: ' + err.message });
  }
};

/**
 * POST /api/auth/passkey/login-begin
 * Generates WebAuthn authentication options.
 */
const loginPasskeyBegin = async (req, res) => {
  const { email } = req.body;

  let user = null;
  if (email) {
    user = await User.findOne({ email: email.toLowerCase().trim() });
  }

  // If user found, get their credentials for authentication
  let allowCredentials = [];
  if (user) {
    const credentials = await PasskeyCredential.find({ userId: user._id });
    allowCredentials = credentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
  });

  // Store challenge temporarily
  // In production, use a proper challenge store (Redis)
  if (user) {
    user.rememberMeToken = options.challenge;
    await user.save();
  } else {
    // Store challenge in a temporary cache (simplified — use Redis in production)
    // For now, just use a global Map-like approach by storing in the request
    req.passkeyChallenge = options.challenge;
    // In production, you'd store this challenge keyed by a session ID
  }

  res.json(options);
};

/**
 * POST /api/auth/passkey/login-complete
 * Validates the WebAuthn assertion and logs the user in.
 */
const loginPasskeyComplete = async (req, res) => {
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ message: 'Authentication response is required' });
  }

  // Find the credential by ID
  const credentialId = response.id;
  const storedCredential = await PasskeyCredential.findOne({ credentialId });

  if (!storedCredential) {
    return res.status(400).json({ message: 'Passkey not found. Please register first.' });
  }

  const user = await User.findById(storedCredential.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const expectedChallenge = user.rememberMeToken;
  if (!expectedChallenge) {
    return res.status(400).json({ message: 'No authentication in progress. Please start again.' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedCredential.credentialId,
        publicKey: Buffer.from(storedCredential.publicKey, 'base64'),
        counter: storedCredential.counter,
        transports: storedCredential.transports,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ message: 'Passkey authentication failed' });
    }

    // Update counter
    storedCredential.counter = verification.authenticationInfo.newCounter;
    await storedCredential.save();

    // Clear challenge
    user.rememberMeToken = null;
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const { refreshToken } = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.org,
      profileImage: user.profileImage,
      accessToken,
    });
  } catch (err) {
    return res.status(400).json({ message: 'Passkey authentication failed: ' + err.message });
  }
};

/**
 * GET /api/auth/passkey/credentials
 * Lists all passkey credentials for the authenticated user.
 */
const listPasskeyCredentials = async (req, res) => {
  const credentials = await PasskeyCredential.find({ userId: req.user._id })
    .select('deviceName createdAt counter')
    .sort({ createdAt: -1 });

  res.json(credentials);
};

/**
 * DELETE /api/auth/passkey/credentials/:id
 * Removes a passkey credential.
 */
const removePasskeyCredential = async (req, res) => {
  const { id } = req.params;

  const credential = await PasskeyCredential.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!credential) {
    return res.status(404).json({ message: 'Passkey not found' });
  }

  await credential.deleteOne();

  res.json({ message: 'Passkey removed successfully' });
};

module.exports = {
  registerPasskeyBegin,
  registerPasskeyComplete,
  loginPasskeyBegin,
  loginPasskeyComplete,
  listPasskeyCredentials,
  removePasskeyCredential,
};

