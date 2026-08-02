/**
 * In-memory demo data store.
 *
 * Demo mode runs WITHOUT MongoDB (when MONGO_URI is unset or unreachable).
 * This module holds the demo user/org/brand-kits/assets in memory and exposes
 * CRUD helpers so:
 *   - demoController can serve /api/demo/* endpoints
 *   - exportController can render/export demo assets (including assets the
 *     user creates during the demo session)
 *
 * All state is transient — it resets when the server restarts.
 */

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
  owner: DEMO_USER._id,
  tier: 'pro',
  activeBrandKit: '507f1f77bcf86cd799439013',
};

const DEMO_KIT = {
  _id: '507f1f77bcf86cd799439013',
  org: DEMO_ORG._id,
  name: 'Acme Brand Kit',
  colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'],
  fonts: { heading: 'Poppins', body: 'Inter' },
  logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=ACME',
  version: 3,
  createdBy: DEMO_USER._id,
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
};

const DEMO_MEMBERS = [
  { _id: DEMO_USER._id, name: 'Demo User', email: 'demo@brandos.io', role: 'owner', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { _id: '507f1f77bcf86cd799439017', name: 'Jane Member', email: 'jane@acme.demo', role: 'member', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const demoTimestamp = (daysAgo) => new Date(Date.now() - 86400000 * (daysAgo || 0)).toISOString();

let demoBrandKits = [
  { ...DEMO_KIT },
];

let demoAssets = [
  {
    _id: '507f1f77bcf86cd799439014',
    org: DEMO_ORG._id,
    brandKit: { ...DEMO_KIT },
    type: 'card',
    name: 'Welcome Card',
    data: {
      dimensions: { width: 1200, height: 675 },
      elements: [
        { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#FF4D4D' },
        { type: 'text', left: 100, top: 200, fontSize: 64, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, text: 'Welcome to\nAcme Corp', width: 1000 },
      ],
    },
    exportUrl: '',
    createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
    createdAt: demoTimestamp(3),
    updatedAt: demoTimestamp(1),
  },
  {
    _id: '507f1f77bcf86cd799439015',
    org: DEMO_ORG._id,
    brandKit: { ...DEMO_KIT },
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
    exportUrl: '',
    createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
    createdAt: demoTimestamp(2),
    updatedAt: demoTimestamp(1),
  },
  {
    _id: '507f1f77bcf86cd799439016',
    org: DEMO_ORG._id,
    brandKit: { ...DEMO_KIT },
    type: 'letterhead',
    name: 'Company Letterhead',
    data: {
      header: 'Acme Corp\n123 Business Street, Mumbai - 400001\n+91 98765 43210',
      body: 'Dear Sir/Madam,\n\nThis is to certify that...\n\nThank you,\nDemo User',
      footer: 'info@acme.demo | www.acme.demo',
    },
    exportUrl: '',
    createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
    createdAt: demoTimestamp(5),
    updatedAt: demoTimestamp(1),
  },
];

// ─── Getters ────────────────────────────────────────────────────────────

function getDemoUser() {
  return { ...DEMO_USER };
}

function getDemoOrg() {
  return { ...DEMO_ORG };
}

function getDemoMembers() {
  return demoMembers = demoMembers.map((m) => ({ ...m }));
}

function getDemoBrandKits() {
  return demoBrandKits.map((k) => ({ ...k }));
}

function findDemoBrandKit(id) {
  const kit = demoBrandKits.find((k) => k._id === id);
  return kit ? { ...kit } : null;
}

function getDemoAssets() {
  // Brand kit is embedded in the returned asset (matches what the DB
  // population produces) so client pages can read brandKit.name etc.
  return demoAssets.map((a) => ({
    ...a,
    brandKit: a.brandKit && a.brandKit._id ? { ...a.brandKit } : { ...DEMO_KIT },
  }));
}

function findDemoAsset(id) {
  const asset = demoAssets.find((a) => a._id === id);
  if (!asset) return null;
  return {
    ...asset,
    brandKit: asset.brandKit && asset.brandKit._id ? { ...asset.brandKit } : { ...DEMO_KIT },
  };
}

// ─── Mutations ──────────────────────────────────────────────────────────

function createDemoBrandKit(data) {
  const now = demoTimestamp(0);
  const kit = {
    _id: '507f1f77bcf86cd799439013',
    org: DEMO_ORG._id,
    name: (data && data.name) || 'Untitled Brand Kit',
    colors: (data && data.colors) || [],
    fonts: (data && data.fonts) || { heading: 'Poppins', body: 'Inter' },
    logoUrl: (data && data.logoUrl) || '',
    version: 1,
    createdBy: DEMO_USER._id,
    createdAt: now,
    updatedAt: now,
  };
  // Update the (single) demo kit in place so IDs stay stable.
  demoBrandKits = [kit];
  return { ...kit };
}

function updateDemoBrandKit(id, data) {
  const existing = demoBrandKits.find((k) => k._id === id);
  const kit = {
    _id: id,
    org: DEMO_ORG._id,
    name: (data && data.name) || existing?.name || 'Acme Brand Kit',
    colors: (data && data.colors) || existing?.colors || DEMO_KIT.colors,
    fonts: (data && data.fonts) || existing?.fonts || DEMO_KIT.fonts,
    logoUrl: (data && data.logoUrl) || existing?.logoUrl || DEMO_KIT.logoUrl,
    version: (existing?.version || DEMO_KIT.version) + 1,
    createdBy: DEMO_USER._id,
    createdAt: existing?.createdAt || demoTimestamp(3),
    updatedAt: demoTimestamp(0),
  };
  demoBrandKits = demoBrandKits.map((k) => (k._id === id ? kit : k));
  return { ...kit };
}

function deleteDemoBrandKit(id) {
  demoBrandKits = demoBrandKits.filter((k) => k._id !== id);
  return true;
}

function createDemoAsset(data) {
  const now = demoTimestamp(0);
  const asset = {
    _id: 'demo-' + Date.now(),
    org: DEMO_ORG._id,
    brandKit: { ...DEMO_KIT, _id: (data && data.brandKit) || DEMO_KIT._id },
    type: (data && data.type) || 'card',
    name: (data && data.name) || 'Untitled Asset',
    data: (data && data.data) || {},
    exportUrl: '',
    createdBy: { _id: DEMO_USER._id, name: 'Demo User' },
    createdAt: now,
    updatedAt: now,
  };
  demoAssets.push(asset);
  return { ...asset };
}

function updateDemoAsset(id, data) {
  const idx = demoAssets.findIndex((a) => a._id === id);
  if (idx === -1) return null;
  const existing = demoAssets[idx];
  const updated = {
    ...existing,
    name: (data && data.name !== undefined) ? data.name : existing.name,
    type: (data && data.type) || existing.type,
    data: (data && data.data !== undefined) ? data.data : existing.data,
    updatedAt: demoTimestamp(0),
  };
  // Preserve brandKit if not changing
  if (data && data.brandKit && existing.brandKit && existing.brandKit._id !== data.brandKit) {
    updated.brandKit = { ...DEMO_KIT, _id: data.brandKit };
  }
  demoAssets[idx] = updated;
  return { ...updated };
}

function deleteDemoAsset(id) {
  const idx = demoAssets.findIndex((a) => a._id === id);
  if (idx === -1) return false;
  demoAssets.splice(idx, 1);
  return true;
}

function setActiveDemoKit(id) {
  DEMO_ORG.activeBrandKit = id;
  return id;
}

function getDemoStats() {
  const totalAssets = demoAssets.length;
  const typeCounts = {};
  demoAssets.forEach((a) => {
    typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
  });
  return {
    totalAssets,
    memberCount: DEMO_MEMBERS.length,
    exportsThisMonth: 5,
    assetTypes: Object.keys(typeCounts).map((t) => ({ _id: t, count: typeCounts[t] })),
  };
}

// Keep members array reference mutable for add.
let demoMembers = DEMO_MEMBERS.slice();

function addDemoMember(data) {
  const member = {
    _id: 'demo-member-' + Date.now(),
    name: (data && data.name) || 'New Member',
    email: (data && data.email) || '',
    role: 'member',
    createdAt: demoTimestamp(0),
  };
  demoMembers.push(member);
  return { ...member };
}

module.exports = {
  DEMO_USER,
  DEMO_ORG,
  DEMO_KIT,
  getDemoUser,
  getDemoOrg,
  getDemoMembers,
  getDemoBrandKits,
  findDemoBrandKit,
  getDemoAssets,
  findDemoAsset,
  createDemoBrandKit,
  updateDemoBrandKit,
  deleteDemoBrandKit,
  createDemoAsset,
  updateDemoAsset,
  deleteDemoAsset,
  setActiveDemoKit,
  getDemoStats,
  addDemoMember,
};

