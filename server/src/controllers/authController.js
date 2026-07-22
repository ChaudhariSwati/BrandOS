require('express-async-errors');
const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { OAuth2Client } = require('google-auth-library');
const {
  generateAccessToken,
  generate2FATempToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../utils/tokenUtils');
const cache = require('../utils/cache');

// Google OAuth client — initialized lazily so missing env var doesn't crash the server
let googleClient = null;
function getGoogleClient() {
  if (!googleClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      googleClient = new OAuth2Client(clientId);
    }
  }
  return googleClient;
}

// POST /api/auth/signup
const signup = async (req, res) => {
  const { name, email, password, orgName } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Create user first (no org yet)
  const user = await User.create({ name, email, password, role: 'owner' });

  // Create organization with the user as owner
  const org = await Organization.create({
    name: orgName || `${name}'s Organization`,
    owner: user._id,
    tier: 'free',
  });

  // Update user with org reference
  user.org = org._id;
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { refreshToken } = generateRefreshToken(user);

  // Invalidate any cached profile for this user
  await cache.del(cache.key('user', user._id.toString()));

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    org: user.org,
    accessToken,
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  // Use generic error to prevent email enumeration
  const invalidCredentialsError = 'Invalid email or password';

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error(invalidCredentialsError);
  }

  // If 2FA is enabled, return a temporary token instead of full access
  if (user.twoFactorEnabled) {
    const tempToken = generate2FATempToken(user);
    return res.json({
      requires2FA: true,
      tempToken,
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { refreshToken } = generateRefreshToken(user);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    org: user.org,
    accessToken,
  });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!rawToken) {
    res.status(401);
    throw new Error('Refresh token not provided');
  }

  const payload = await verifyRefreshToken(rawToken);
  if (!payload) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }

  // Fetch user to ensure they still exist and are active
  const user = await User.findById(payload.userId).select('-password');
  if (!user) {
    // User was deleted — revoke the token
    await revokeRefreshToken(rawToken);
    res.status(401);
    throw new Error('User no longer exists');
  }

  // Revoke old refresh token (rotation)
  await revokeRefreshToken(rawToken);

  // Issue new tokens
  const accessToken = generateAccessToken(user);
  const { refreshToken: newRefreshToken } = generateRefreshToken(user);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({
    accessToken,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    org: user.org,
  });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }

  // Also blacklist the access token for its remaining TTL
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1];
    try {
      const decoded = require('jsonwebtoken').decode(accessToken);
      if (decoded?.id) {
        // Blacklist for 15 minutes (max remaining access token life)
        await cache.set(
          cache.key('blacklist', decoded.id, accessToken.substring(0, 16)),
          true,
          900
        );
      }
    } catch {
      // Ignore decode errors
    }
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  // Demo mode: return inline data without DB
  if (req.user.isDemo) {
    return res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      org: { _id: req.user.org, name: 'Acme Corp', tier: 'pro' },
      isDemo: true,
    });
  }

  const user = await User.findById(req.user._id).populate('org', 'name tier');
  res.json(user);
};

// POST /api/auth/google — Google OAuth Sign-In / Sign-Up
const googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error('Google credential is required');
  }

  const client = getGoogleClient();
  if (!client) {
    res.status(500);
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in environment.');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid Google credential: ' + err.message);
  }

  const { sub: googleId, email, name, picture } = payload;

  // Find user by email first, then link Google ID
  let user = await User.findOne({ email });

  if (user) {
    // Existing user — update Google ID if not set
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    // New user — create account with Google info
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: crypto.randomBytes(24).toString('hex'), // Random password (user logs in via Google)
      googleId,
      role: 'owner',
    });

    // Create default organization for new Google users
    const org = await Organization.create({
      name: `${user.name}'s Organization`,
      owner: user._id,
      tier: 'free',
    });

    user.org = org._id;
    await user.save();
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { refreshToken } = generateRefreshToken(user);

  // Invalidate any cached profile for this user
  await cache.del(cache.key('user', user._id.toString()));

  // Set refresh token as HTTP-only cookie
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
    accessToken,
    picture: picture || undefined,
  });
};

module.exports = { signup, login, googleAuth, refresh, logout, getMe };
