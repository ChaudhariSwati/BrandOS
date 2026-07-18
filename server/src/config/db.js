const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (uri) {
    // Production mode — connect to MongoDB Atlas
    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
      console.error(`MongoDB connection error: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  // Local demo mode — try mongodb-memory-server (must be installed as devDep)
  console.log('No MONGO_URI set. Attempting demo mode with in-memory MongoDB...');
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const demoUri = await mongod.getUri();
    await mongoose.connect(demoUri);
    console.log(`In-memory MongoDB started at ${demoUri}`);
    await seedDemoData();
  } catch (err) {
    console.error('Demo mode requires mongodb-memory-server.');
    console.error('  Run: npm install mongodb-memory-server --save-dev');
    console.error('  Or set MONGO_URI in your .env file.');
    process.exit(1);
  }
};

async function seedDemoData() {
  const User = require('../models/User');
  const Organization = require('../models/Organization');
  const BrandKit = require('../models/BrandKit');
  const Asset = require('../models/Asset');

  const existing = await User.countDocuments();
  if (existing > 0) return;

  console.log('Seeding demo data...');

  const user = await User.create({
    name: 'Demo User',
    email: 'demo@brandos.io',
    password: 'demo123',
    role: 'owner',
  });

  const org = await Organization.create({
    name: 'Acme Corp',
    owner: user._id,
    tier: 'pro',
  });

  user.org = org._id;
  await user.save();

  const kit = await BrandKit.create({
    org: org._id,
    name: 'Acme Brand Kit',
    colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'],
    fonts: { heading: 'Poppins', body: 'Inter' },
    logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=ACME',
    createdBy: user._id,
  });
  org.activeBrandKit = kit._id;
  await org.save();

  await Asset.create({ org: org._id, brandKit: kit._id, type: 'card', name: 'Welcome Card',
    data: { dimensions: { width: 1200, height: 675 },
      elements: [
        { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#FF4D4D' },
        { type: 'text', left: 100, top: 200, fontSize: 64, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, text: 'Welcome to\nAcme Corp', width: 1000 },
      ] }, createdBy: user._id });

  await Asset.create({ org: org._id, brandKit: kit._id, type: 'invoice', name: 'Invoice #001',
    data: { invoiceData: { gstin: '22AAAAA0000A1Z5', hsnCodes: '8471', isGstEnabled: true,
      lineItems: [
        { description: 'Website Design', quantity: 1, rate: 25000 },
        { description: 'Logo Design', quantity: 2, rate: 5000 },
      ] } }, createdBy: user._id });

  await Asset.create({ org: org._id, brandKit: kit._id, type: 'letterhead', name: 'Company Letterhead',
    data: { header: 'Acme Corp\n123 Business Street, Mumbai - 400001\n+91 98765 43210',
      body: 'Dear Sir/Madam,\n\nThis is to certify that...\n\nThank you,\nDemo User',
      footer: 'info@acme.demo | www.acme.demo' }, createdBy: user._id });

  await User.create({ name: 'Jane Member', email: 'jane@acme.demo', password: 'demo123', org: org._id, role: 'member' });

  console.log('✅ Demo data seeded! Login: demo@brandos.io / demo123');
}

module.exports = connectDB;
