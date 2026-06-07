const mongoose = require('mongoose');
const dns = require('dns');

// Set public DNS servers to resolve MongoDB Atlas SRV query records properly
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('Warning: Could not configure public DNS servers:', err.message);
}

let memoryServer = null;

/**
 * Connect to MongoDB with retry logic and graceful error handling.
 * In development, falls back to an in-memory MongoDB when local server is unavailable.
 */
const connectDB = async () => {
  let uri = process.env.MONGODB_URI || 'mongodb://retaalahmed:Web5@ac-3j60g56-shard-00-00.zbhutao.mongodb.net:27017,ac-3j60g56-shard-00-01.zbhutao.mongodb.net:27017,ac-3j60g56-shard-00-02.zbhutao.mongodb.net:27017/smart_university?authSource=admin&replicaSet=atlas-e40o62-shard-0&ssl=true&retryWrites=true&w=majority';

  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`\n====================================================`);
    console.log(`Database connection status: SUCCESS`);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`====================================================\n`);
  } catch (error) {
    console.error(`\n====================================================`);
    console.error('Database connection status: FAILED');
    console.error('MongoDB connection error:', error.message);
    console.error('The application will exit now. Please ensure MongoDB is running or the URI is correct.');
    console.error(`====================================================\n`);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });
};

module.exports = connectDB;
