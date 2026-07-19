/**
 * MongoDB Index Definitions for BrandOS.
 *
 * Run manually: node src/config/indexes.js
 * Or include in startup for auto-indexing (enabled by default in Mongoose).
 *
 * Mongoose's `autoIndex` is true in development; set to false in production
 * after indexes are verified. Run this script in production to create indexes.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function createIndexes() {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  console.log('Connected to MongoDB — creating indexes...\n');

  const db = mongoose.connection.db;

  // ── Users ──────────────────────────────────────────────
  const usersCollection = db.collection('users');
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ org: 1 });
  await usersCollection.createIndex({ role: 1 });
  console.log('✓ users indexes created');

  // ── Organizations ─────────────────────────────────────
  const orgsCollection = db.collection('organizations');
  await orgsCollection.createIndex({ owner: 1 });
  await orgsCollection.createIndex({ tier: 1 });
  console.log('✓ organizations indexes created');

  // ── BrandKits ─────────────────────────────────────────
  const brandKitsCollection = db.collection('brandkits');
  await brandKitsCollection.createIndex({ org: 1, createdAt: -1 });
  await brandKitsCollection.createIndex({ org: 1, name: 1 });
  console.log('✓ brandkits indexes created');

  // ── Assets ────────────────────────────────────────────
  const assetsCollection = db.collection('assets');
  await assetsCollection.createIndex({ org: 1, type: 1, createdAt: -1 });
  await assetsCollection.createIndex({ org: 1, updatedAt: -1 });
  await assetsCollection.createIndex({ brandKit: 1 });
  await assetsCollection.createIndex({ createdBy: 1 });
  await assetsCollection.createIndex({ org: 1, type: 1, updatedAt: -1 });
  console.log('✓ assets indexes created');

  console.log('\n✅ All indexes created successfully');
  await mongoose.disconnect();
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
