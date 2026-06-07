/**
 * Seed default admin account for first-run setup.
 * Run: npm run seed:admin
 */
require('dotenv').config();
const connectDB = require('../config/db');
const startupSeed = require('./startupSeed');

async function seedAdmin() {
  try {
    await connectDB();
    await startupSeed();
    console.log('Default admin: admin@smartuniversity.com / Admin123!');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seedAdmin();
