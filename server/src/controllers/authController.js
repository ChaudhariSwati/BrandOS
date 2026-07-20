require('express-async-errors');
const User = require('../models/User');
const Organization = require('../models/Organization');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../utils/tokenUtils');
const cache = require('../utils/cache');

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

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
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

module.exports = { signup, login, refresh, logout, getMe };
