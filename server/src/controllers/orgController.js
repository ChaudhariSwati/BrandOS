const Organization = require('../models/Organization');
const User = require('../models/User');
const Asset = require('../models/Asset');
const { requireRole } = require('../middleware/authMiddleware');

// GET /api/orgs/current
const getCurrentOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.orgId).populate('activeBrandKit', 'name colors fonts logoUrl');
    res.json(org);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orgs/current
const updateOrg = async (req, res, next) => {
  try {
    const { name, tier } = req.body;
    const org = await Organization.findById(req.orgId);
    if (!org) {
      res.status(404);
      throw new Error('Organization not found');
    }
    if (name) org.name = name;
    if (tier) org.tier = tier;
    await org.save();
    res.json(org);
  } catch (err) {
    next(err);
  }
};

// GET /api/orgs/members
const getMembers = async (req, res, next) => {
  try {
    const members = await User.find({ org: req.orgId }).select('name email role createdAt');
    res.json(members);
  } catch (err) {
    next(err);
  }
};

// POST /api/orgs/members (owner only)
const addMember = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400);
      throw new Error('email, name, and password required');
    }
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400);
      throw new Error('User already exists with this email');
    }
    const member = await User.create({ name, email, password, org: req.orgId, role: 'member' });
    res.status(201).json({ _id: member._id, name: member.name, email: member.email, role: member.role });
  } catch (err) {
    next(err);
  }
};

// GET /api/orgs/stats — simple usage stats for dashboard
const getStats = async (req, res, next) => {
  try {
    const totalAssets = await Asset.countDocuments({ org: req.orgId });
    const assetTypes = await Asset.aggregate([
      { $match: { org: require('mongoose').Types.ObjectId.createFromHexString(req.orgId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const memberCount = await User.countDocuments({ org: req.orgId });
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const exportsThisMonth = await Asset.countDocuments({ org: req.orgId, updatedAt: { $gte: thisMonth } });

    res.json({
      totalAssets,
      memberCount,
      exportsThisMonth,
      assetTypes,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCurrentOrg, updateOrg, getMembers, addMember, getStats };
