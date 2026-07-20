const jwt = require('jsonwebtoken');

// Embedded demo data — used when MongoDB is unavailable
const DEMO_USER = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Demo User',
  email: 'demo@brandos.io',
  role: 'owner',
  org: '507f1f77bcf86cd799439012',
};

const DEMO_ORG = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Acme Corp',
  tier: 'pro',
};

// Get JWT secret with a hardcoded fallback for demo mode
const getDemoJwtSecret = () => {
  return process.env.JWT_SECRET || 'demo-fallback-secret-brandos-2024';
};

// POST /api/auth/demo
const demoLogin = async (req, res) => {
  const secret = getDemoJwtSecret();
  const accessToken = jwt.sign(
    {
      id: DEMO_USER._id,
      org: DEMO_USER.org,
      role: DEMO_USER.role,
      type: 'access',
      isDemo: true,
    },
    secret,
    { expiresIn: '2h' }
  );

  res.json({
    _id: DEMO_USER._id,
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    role: DEMO_USER.role,
    org: DEMO_USER.org,
    accessToken,
    isDemo: true,
  });
};

// GET /api/demo/org — returns demo org data (no DB needed)
const getDemoOrg = async (req, res) => {
  res.json(DEMO_ORG);
};

// POST /api/demo/brandkits — create a new brand kit (demo)
const createDemoBrandKit = async (req, res) => {
  const { name, colors, fonts, logoUrl } = req.body;
  const newKit = {
    _id: '507f1f77bcf86cd799439013',
    org: DEMO_USER.org,
    name: name || 'Untitled Brand Kit',
    colors: colors || [],
    fonts: fonts || { heading: 'Poppins', body: 'Inter' },
    logoUrl: logoUrl || '',
    version: 1,
    createdBy: DEMO_USER._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  res.status(201).json(newKit);
};

// GET /api/demo/brandkits — returns demo brand kit data
const getDemoBrandKits = async (req, res) => {
  res.json([
    {
      _id: '507f1f77bcf86cd799439013',
      org: DEMO_USER.org,
      name: 'Acme Brand Kit',
      colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'],
      fonts: { heading: 'Poppins', body: 'Inter' },
      logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=ACME',
      version: 3,
      createdAt: new Date().toISOString(),
    },
  ]);
};

// GET /api/demo/assets — returns demo assets
const getDemoAssets = async (req, res) => {
  res.json([
    {
      _id: '507f1f77bcf86cd799439014',
      org: DEMO_USER.org,
      brandKit: { _id: '507f1f77bcf86cd799439013', name: 'Acme Brand Kit', colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'], fonts: { heading: 'Poppins', body: 'Inter' } },
      type: 'card',
      name: 'Welcome Card',
      data: {
        dimensions: { width: 1200, height: 675 },
        elements: [
          { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#FF4D4D' },
          { type: 'text', left: 100, top: 200, fontSize: 64, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, text: 'Welcome to\nAcme Corp', width: 1000 },
        ],
      },
      createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: '507f1f77bcf86cd799439015',
      org: DEMO_USER.org,
      brandKit: { _id: '507f1f77bcf86cd799439013', name: 'Acme Brand Kit', colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'], fonts: { heading: 'Poppins', body: 'Inter' } },
      type: 'invoice',
      name: 'Invoice #001',
      data: {
        invoiceData: {
          gstin: '22AAAAA0000A1Z5',
          hsnCodes: '8471',
          isGstEnabled: true,
          lineItems: [
            { description: 'Website Design', quantity: 1, rate: 25000 },
            { description: 'Logo Design', quantity: 2, rate: 5000 },
          ],
        },
      },
      createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: '507f1f77bcf86cd799439016',
      org: DEMO_USER.org,
      brandKit: { _id: '507f1f77bcf86cd799439013', name: 'Acme Brand Kit', colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'], fonts: { heading: 'Poppins', body: 'Inter' } },
      type: 'letterhead',
      name: 'Company Letterhead',
      data: {
        header: 'Acme Corp\n123 Business Street, Mumbai - 400001\n+91 98765 43210',
        body: 'Dear Sir/Madam,\n\nThis is to certify that...\n\nThank you,\nDemo User',
        footer: 'info@acme.demo | www.acme.demo',
      },
      createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
};

// GET /api/demo/stats — returns demo stats
const getDemoStats = async (req, res) => {
  res.json({
    totalAssets: 3,
    memberCount: 2,
    exportsThisMonth: 5,
    assetTypes: [
      { _id: 'card', count: 1 },
      { _id: 'invoice', count: 1 },
      { _id: 'letterhead', count: 1 },
    ],
  });
};

// GET /api/demo/members — returns demo team members
const getDemoMembers = async (req, res) => {
  res.json([
    { _id: DEMO_USER._id, name: 'Demo User', email: 'demo@brandos.io', role: 'owner' },
    { _id: '507f1f77bcf86cd799439017', name: 'Jane Member', email: 'jane@acme.demo', role: 'member' },
  ]);
};

// PUT /api/demo/brandkits/:id — update a brand kit (demo)
const updateDemoBrandKit = async (req, res) => {
  const { name, colors, fonts, logoUrl } = req.body;
  const updatedKit = {
    _id: req.params.id,
    org: DEMO_USER.org,
    name: name || 'Acme Brand Kit',
    colors: colors || ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'],
    fonts: fonts || { heading: 'Poppins', body: 'Inter' },
    logoUrl: logoUrl || 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=ACME',
    version: 4,
    createdBy: DEMO_USER._id,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  res.json(updatedKit);
};

// DELETE /api/demo/brandkits/:id — delete a brand kit (demo)
const deleteDemoBrandKit = async (req, res) => {
  res.json({ message: 'Brand kit deleted' });
};

// POST /api/demo/brandkits/:id/logo — upload logo for a kit (demo)
const uploadDemoLogo = async (req, res) => {
  res.json({ logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=LOGO' });
};

// POST /api/demo/brandkits/:id/set-active — set a kit as active (demo)
const setActiveDemoKit = async (req, res) => {
  res.json({ activeBrandKit: req.params.id });
};

module.exports = { demoLogin, getDemoOrg, createDemoBrandKit, getDemoBrandKits, updateDemoBrandKit, deleteDemoBrandKit, uploadDemoLogo, setActiveDemoKit, getDemoAssets, getDemoStats, getDemoMembers };
