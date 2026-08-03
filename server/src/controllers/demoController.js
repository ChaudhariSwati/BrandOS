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

// ─── Demo AI Generation (no Gemini key / no DB needed) ────────────────
const DEMO_CARD_DESIGN = (prompt, templateKey) => {
  const title = (prompt || 'Acme Corp').trim().split(/\s+/).slice(0, 5).join(' ');
  if (templateKey === 'social') {
    return [
      { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#1A1A1A', rx: 0 },
      { type: 'rect', left: 80, top: 80, width: 200, height: 12, fill: '#FF4D4D', rx: 6 },
      { type: 'text', left: 80, top: 130, text: title, fontSize: 72, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 1040, textAlign: 'left' },
      { type: 'text', left: 80, top: 260, text: 'Demo design powered by BrandOS', fontSize: 28, fontFamily: 'Inter', fill: '#FFD166', fontWeight: 500, width: 800, textAlign: 'left' },
    ];
  }
  return [
    { type: 'rect', left: 0, top: 0, width: 1050, height: 600, fill: '#1A1A1A', rx: 44 },
    { type: 'rect', left: 0, top: 0, width: 300, height: 600, fill: '#FF4D4D', rx: 44 },
    { type: 'text', left: 60, top: 72, text: 'BK', fontSize: 68, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 160, textAlign: 'center' },
    { type: 'text', left: 340, top: 120, text: title, fontSize: 58, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 620, textAlign: 'left' },
    { type: 'text', left: 340, top: 196, text: 'Demo card powered by BrandOS', fontSize: 24, fontFamily: 'Inter', fill: '#FFD166', fontWeight: 600, width: 620, textAlign: 'left' },
    { type: 'text', left: 340, top: 314, text: 'demo@brandos.com   |   +91 90000 00000', fontSize: 22, fontFamily: 'Inter', fill: '#FFFFFF', fontWeight: 500, width: 620, textAlign: 'left' },
  ];
};

// POST /api/demo/ai/generate-card
const generateDemoCard = async (req, res) => {
  const { prompt, template } = req.body || {};
  res.json({
    elements: DEMO_CARD_DESIGN(prompt, template),
    name: (prompt || 'Demo Card').trim().split(/\s+/).slice(0, 4).join(' '),
    ai: false,
    demo: true,
  });
};

// POST /api/demo/ai/generate-card-copy
const generateDemoCardCopy = async (req, res) => {
  const { prompt } = req.body || {};
  res.json({
    headline: prompt ? `Demo: ${prompt.trim().split(/\s+/).slice(0, 4).join(' ')}` : 'Acme Corp Demo',
    subheadline: 'Demo mode — add a GEMINI_API_KEY to unlock real AI copywriting.',
    cta: 'Get Started',
    ai: false,
    demo: true,
  });
};

// GET /api/demo/ai/health
const demoAiHealth = (req, res) => {
  res.json({ configured: false, demo: true });
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
  generateDemoCard,
  generateDemoCardCopy,
  demoAiHealth,
};

