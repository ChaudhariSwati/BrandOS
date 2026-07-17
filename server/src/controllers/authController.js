const User = require('../models/User');
const Organization = require('../models/Organization');
const generateToken = require('../utils/generateToken');

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password, orgName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    // Create organization (owner's org)
    const org = await Organization.create({
      name: orgName || `${name}'s Organization`,
      owner: null, // placeholder, will update
      tier: 'free',
    });

    // Create user with org reference
    const user = await User.create({ name, email, password, org: org._id, role: 'owner' });

    // Update org with owner
    org.owner = user._id;
    await org.save();

    const token = generateToken(user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.org,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const token = generateToken(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.org,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('org', 'name tier');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, getMe };
