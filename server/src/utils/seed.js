/**
 * BrandOS database seed script.
 *
 * Usage:
 *   npm run seed
 *   MONGO_URI=mongodb://... npm run seed
 *
 * Seeds a demo org + owner, a brand kit, and sample assets (card, invoice,
 * letterhead) so the app is immediately usable after a fresh database.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Seed script requires a MongoDB connection string.');
  console.error('Example: MONGO_URI=mongodb://localhost:27017/brandos npm run seed');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    bufferCommands: false,
    bufferTimeoutMS: 0,
  });
  console.log('Connected.');

  const User = require('../models/User');
  const Organization = require('../models/Organization');
  const BrandKit = require('../models/BrandKit');
  const Asset = require('../models/Asset');

  const existing = await User.countDocuments();
  if (existing > 0) {
    console.log('Users already exist — skipping seed to avoid duplicates.');
    console.log('If you want a fresh seed, drop the database first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Seeding demo data...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  const user = await User.create({
    name: 'Demo User',
    email: 'demo@brandos.io',
    password: hashedPassword,
    role: 'owner',
    emailVerified: true,
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

  await Asset.create({
    org: org._id,
    brandKit: kit._id,
    type: 'card',
    name: 'Welcome Card',
    data: {
      dimensions: { width: 1200, height: 675 },
      elements: [
        { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#FF4D4D' },
        { type: 'text', left: 100, top: 200, fontSize: 64, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, text: 'Welcome to\nAcme Corp', width: 1000 },
      ],
    },
    createdBy: user._id,
  });

  await Asset.create({
    org: org._id,
    brandKit: kit._id,
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
    createdBy: user._id,
  });

  await Asset.create({
    org: org._id,
    brandKit: kit._id,
    type: 'letterhead',
    name: 'Company Letterhead',
    data: {
      header: 'Acme Corp\n123 Business Street, Mumbai - 400001\n+91 98765 43210',
      body: 'Dear Sir/Madam,\n\nThis is to certify that...\n\nThank you,\nDemo User',
      footer: 'info@acme.demo | www.acme.demo',
    },
    createdBy: user._id,
  });

  await User.create({
    name: 'Jane Member',
    email: 'jane@acme.demo',
    password: await bcrypt.hash('Jane@123', 12),
    org: org._id,
    role: 'member',
    emailVerified: true,
  });

  console.log('');
  console.log('✅ Demo data seeded!');
  console.log('   Owner login:  demo@brandos.io / Demo@123');
  console.log('   Member login: jane@acme.demo  / Jane@123');
  console.log('');

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

