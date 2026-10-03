/**
 * Healthcare Assistant Backend Server
 * Entry point — configures Express, mounts routes, connects DB
 * Loaded Google Client ID configured
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const drugRoutes = require('./routes/drugs');
const emergencyRoutes = require('./routes/emergency');
const historyRoutes = require('./routes/history');

// Initialize Express app
const app = express();

const allowedOrigins = new Set(
  String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (NODE_ENV !== 'production') {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.hostname.endsWith('.vercel.app') || parsedOrigin.hostname === 'vercel.app';
  } catch (error) {
    return false;
  }
};

// ─── Security Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // Limit each IP to 100 requests per window
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/history', historyRoutes);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Healthcare Assistant API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`\n🏥 Healthcare Assistant API Server`);
      console.log(`   ├── Environment: ${NODE_ENV}`);
      console.log(`   ├── Port: ${PORT}`);
      console.log(`   ├── URL: http://localhost:${PORT}`);
      console.log(`   └── Health: http://localhost:${PORT}/api/health\n`);
    });

    // Connect to MongoDB in background
    connectDB().catch(err => console.error('DB connect background error:', err.message));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
