const jwt = require('jsonwebtoken');
const store = require('../utils/demoStore');

// Get JWT secret with a hardcoded fallback for demo mode
const getDemoJwtSecret = () => {
  return process.env.JWT_SECRET || 'demo-fallback-secret-brandos-2024';
};

// POST /api/demo/login
const demoLogin = async (req, res) => {
  const user = store.getDemoUser();
  const secret = getDemoJwtSecret();
  const accessToken = jwt.sign(
    {
      id: user._id,
      org: user.org,
      role: user.role,
      type: 'access',
      isDemo: true,
    },
    secret,
    { expiresIn: '2h' }
  );

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    org: user.org,
    accessToken,
    isDemo: true,
  });
};

// GET /api/demo/org
const getDemoOrg = async (req, res) => {
  res.json(store.getDemoOrg());
};

// PUT /api/demo/org — rename the demo org
const updateDemoOrg = async (req, res) => {
  const org = store.getDemoOrg();
  if (req.body && req.body.name) {
    org.name = req.body.name;
  }
  if (req.body && req.body.tier) {
    org.tier = req.body.tier;
  }
  res.json(org);
};

// GET /api/demo/brandkits
const getDemoBrandKits = async (req, res) => {
  res.json(store.getDemoBrandKits());
};

// POST /api/demo/brandkits
const createDemoBrandKit = async (req, res) => {
  const kit = store.createDemoBrandKit(req.body);
  res.status(201).json(kit);
};

// GET /api/demo/brandkits/:id
const getDemoBrandKitById = async (req, res) => {
  const kit = store.findDemoBrandKit(req.params.id);
  if (!kit) {
    res.status(404);
    throw new Error('Brand kit not found');
  }
  res.json(kit);
};

// PUT /api/demo/brandkits/:id
const updateDemoBrandKit = async (req, res) => {
  const kit = store.updateDemoBrandKit(req.params.id, req.body);
  res.json(kit);
};

// DELETE /api/demo/brandkits/:id
const deleteDemoBrandKit = async (req, res) => {
  store.deleteDemoBrandKit(req.params.id);
  res.json({ message: 'Brand kit deleted' });
};

// POST /api/demo/brandkits/:id/logo
const uploadDemoLogo = async (req, res) => {
  res.json({ logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=LOGO' });
};

// POST /api/demo/brandkits/:id/set-active
const setActiveDemoKit = async (req, res) => {
  const id = store.setActiveDemoKit(req.params.id);
  res.json({ activeBrandKit: id });
};

// POST /api/demo/brandkits/extract-colors — mock AI extraction
const extractDemoColors = async (req, res) => {
  res.json({ colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'] });
};

// GET /api/demo/assets
const getDemoAssets = async (req, res) => {
  res.json(store.getDemoAssets());
};

// GET /api/demo/assets/:id
const getDemoAssetById = async (req, res) => {
  const asset = store.findDemoAsset(req.params.id);
  if (!asset) {
    res.status(404);
    throw new Error('Asset not found');
  }
  res.json(asset);
};

// POST /api/demo/assets — create an asset in the in-memory store
const createDemoAsset = async (req, res) => {
  const asset = store.createDemoAsset(req.body);
  res.status(201).json(asset);
};

// PUT /api/demo/assets/:id
const updateDemoAsset = async (req, res) => {
  const asset = store.updateDemoAsset(req.params.id, req.body);
  if (!asset) {
    res.status(404);
    throw new Error('Asset not found');
  }
  res.json(asset);
};

// DELETE /api/demo/assets/:id
const deleteDemoAsset = async (req, res) => {
  const ok = store.deleteDemoAsset(req.params.id);
  if (!ok) {
    res.status(404);
    throw new Error('Asset not found');
  }
  res.json({ message: 'Asset deleted' });
};

// GET /api/demo/stats
const getDemoStats = async (req, res) => {
  res.json(store.getDemoStats());
};

// GET /api/demo/members
const getDemoMembers = async (req, res) => {
  res.json(store.getDemoMembers());
};

// POST /api/demo/members — add a member (owner only, but demo is pro/owner)
const addDemoMember = async (req, res) => {
  const member = store.addDemoMember(req.body);
  res.status(201).json(member);
};

module.exports = {
  demoLogin,
  getDemoOrg,
  updateDemoOrg,
  getDemoBrandKits,
  createDemoBrandKit,
  getDemoBrandKitById,
  updateDemoBrandKit,
  deleteDemoBrandKit,
  uploadDemoLogo,
  setActiveDemoKit,
  extractDemoColors,
  getDemoAssets,
  getDemoAssetById,
  createDemoAsset,
  updateDemoAsset,
  deleteDemoAsset,
  getDemoStats,
  getDemoMembers,
  addDemoMember,
};

