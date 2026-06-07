require('dotenv').config();

// Environment variables defaults (previously in .env)
process.env.PORT = process.env.PORT || 3000;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'smart-university-dev-secret-change-in-production';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://retaalahmed:Web5@ac-3j60g56-shard-00-00.zbhutao.mongodb.net:27017,ac-3j60g56-shard-00-01.zbhutao.mongodb.net:27017,ac-3j60g56-shard-00-02.zbhutao.mongodb.net:27017/smart_university?authSource=admin&replicaSet=atlas-e40o62-shard-0&ssl=true&retryWrites=true&w=majority';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.SESSION_SECURE = process.env.SESSION_SECURE || 'false';
// Local dev: HTTP avoids "Your connection is not private" from self-signed certs.
process.env.USE_HTTPS = process.env.USE_HTTPS || 'false';

const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');

const connectDB = require('./config/db');
const startupSeed = require('./scripts/startupSeed');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const depositRoutes = require('./routes/depositRoutes');

const PORT = process.env.PORT;

const start = async () => {
  // Connect to MongoDB
  await connectDB();

  // Run seed script (idempotent)
  await startupSeed();

  // Create Express application
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Comprehensive Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] Incoming Request:`);
    console.log(`- Method: ${req.method}`);
    console.log(`- URL: ${req.url}`);
    
    // Create a safe copy of the body for logging (exclude passwords)
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[REDACTED]';
    if (safeBody.confirmPassword) safeBody.confirmPassword = '[REDACTED]';
    
    console.log(`- Body:`, Object.keys(safeBody).length > 0 ? safeBody : 'Empty');
    console.log('----------------------------------------------------');
    next();
  });

  /**
   * Sanitize string inputs in request body (basic XSS prevention).
   */
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  });

  const sessionSecure = process.env.SESSION_SECURE === 'true';

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60,
        touchAfter: 3600,
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: sessionSecure,
        maxAge: 24 * 60 * 60 * 1000,
      },
      name: 'connect.sid',
    })
  );

  // Static uploads directory
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/enrollments', enrollmentRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/deposits', depositRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'MIU Portal API is running' });
  });

  // Serve static files in the root
  app.use(express.static(path.join(__dirname)));

  // Fallback for API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Error handling middleware
  app.use(errorHandler);

  // Start listening
  const startListening = (portToTry) => {
    let server;
    const sslKeyPath = path.join(__dirname, 'config', 'ssl', 'key.pem');
    const sslCertPath = path.join(__dirname, 'config', 'ssl', 'cert.pem');

    const useHttps =
      process.env.USE_HTTPS === 'true' &&
      fs.existsSync(sslKeyPath) &&
      fs.existsSync(sslCertPath);

    if (useHttps) {
      const options = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      server = https.createServer(options, app);
      server.listen(portToTry, () => {
        console.log(`MIU Portal API running securely at https://localhost:${portToTry}`);
      });
    } else {
      server = app.listen(portToTry, () => {
        const reason =
          process.env.USE_HTTPS === 'true'
            ? 'SSL certs not found'
            : 'USE_HTTPS is not enabled (set USE_HTTPS=true for local HTTPS)';
        console.log(`MIU Portal API running at http://localhost:${portToTry} (${reason})`);
      });
    }

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${portToTry} is already in use. Retrying on port ${Number(portToTry) + 1}...`);
        startListening(Number(portToTry) + 1);
      } else {
        console.error('Server error:', err.message);
      }
    });
  };

  startListening(PORT);
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
