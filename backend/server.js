require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Routes
const authRoutes = require('./routes/auth');
const graphRoutes = require('./routes/graph');
const diagnosticRoutes = require('./routes/diagnostic');
const adRoutes = require('./routes/ad');
const exchangeRoutes = require('./routes/exchange');
const offboardingRoutes = require('./routes/offboarding');

const app = express();
const PORT = process.env.PORT || 5000;

// Generate encryption key if not set (dev only)
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  ENCRYPTION_KEY not set. Generating temporary key (DEV ONLY)');
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  console.log(`Temporary ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  // Disable COOP header to allow MSAL popup authentication to work
  // MSAL needs to monitor popup windows which COOP blocks
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://onboardingoffboarding.dynamicendpoints.com',
      'http://employeelifecyclepotral.com',
      'https://employeelifecyclepotral.com',
      'http://www.employeelifecyclepotral.com',
      'https://www.employeelifecyclepotral.com'
    ];
    
    console.log('🔍 CORS check - Origin:', origin);
    console.log('🔍 CORS check - Allowed origins:', allowedOrigins);
    
    // Allow requests without origin (same-origin, mobile apps, etc)
    if (!origin) {
      console.log('✅ CORS: Allowing request without origin (same-origin)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.warn(`❌ CORS rejected origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 3600000, // 1 hour
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
};

// Use Neon Postgres for session storage (preferred)
if (process.env.DATABASE_URL) {
  const { createNeonSessionStore } = require('./config/neon-session');
  
  try {
    const { store } = createNeonSessionStore({
      databaseUrl: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      pruneSessionInterval: 60 * 15 // Cleanup old sessions every 15 minutes
    });
    
    sessionConfig.store = store;
    console.log('✅ Using Neon Postgres for session storage');
  } catch (err) {
    console.error('❌ Failed to configure Neon session store:', err.message);
    console.log('⚠️  Falling back to in-memory sessions');
  }
}
// Fallback to Redis if configured
else if (process.env.REDIS_URL) {
  const RedisStore = require('connect-redis').default;
  const { createClient } = require('redis');
  
  const redisClient = createClient({
    url: process.env.REDIS_URL
  });
  
  redisClient.connect().catch(console.error);
  
  sessionConfig.store = new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  });
  
  console.log('✅ Using Redis for session storage');
}
// In-memory sessions for development
else {
  console.log('⚠️  Using in-memory sessions (development only)');
}

app.use(session(sessionConfig));

// Trust proxy if behind a reverse proxy (e.g., nginx, Azure App Service)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/ad', adRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/offboarding', offboardingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Employee Offboarding Portal API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      graph: '/api/graph'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught error:', err);
  console.error('Error stack:', err.stack);
  console.error('Error details:', {
    message: err.message,
    status: err.status,
    name: err.name,
    code: err.code
  });
  
  // Provide useful error information while maintaining security
  const errorResponse = {
    error: err.message || 'An error occurred',
    // Include additional context in development
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      name: err.name,
      code: err.code
    })
  };
  
  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Employee Offboarding Portal - Secure Backend API        ║
╠════════════════════════════════════════════════════════════╣
║   🚀 Server running on port ${PORT.toString().padEnd(27)}║
║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║   🔒 Secure session management enabled                     ║
║   🔐 Credential encryption active                          ║
╚════════════════════════════════════════════════════════════╝
  
Available endpoints:
  - GET  /health
  - GET  /
  - POST /api/auth/configure
  - POST /api/auth/validate
  - POST /api/auth/login-app-only
  - GET  /api/auth/login-oauth2
  - GET  /api/auth/callback
  - GET  /api/auth/session
  - POST /api/auth/logout
  - GET  /api/graph/me
  - GET  /api/graph/users
  - GET  /api/graph/groups
  - GET  /api/graph/devices
  - ALL  /api/graph/proxy/*

Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  `);
  
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  WARNING: SESSION_SECRET not set. Using generated secret (not suitable for production)');
  }
  
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. Using generated key (not suitable for production)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
