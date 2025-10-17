const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

/**
 * Configure Neon Postgres session store
 * @param {Object} options - Configuration options
 * @returns {Object} Session store configuration
 */
function createNeonSessionStore(options = {}) {
  const {
    databaseUrl = process.env.DATABASE_URL,
    tableName = 'user_sessions',
    pruneSessionInterval = 60 * 15, // 15 minutes
    schemaName = 'public'
  } = options;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Neon session store');
  }

  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Neon uses SSL
    },
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test connection
  pool.connect()
    .then(client => {
      console.log('✅ Connected to Neon Postgres for sessions');
      client.release();
    })
    .catch(err => {
      console.error('❌ Failed to connect to Neon:', err.message);
    });

  // Create session store
  const store = new pgSession({
    pool,
    tableName,
    schemaName,
    pruneSessionInterval, // Auto-cleanup old sessions
    createTableIfMissing: true, // Automatically create sessions table
  });

  return { store, pool };
}

/**
 * Initialize session table in Neon (optional - connect-pg-simple does this automatically)
 * @param {Pool} pool - PostgreSQL pool
 */
async function initializeSessionTable(pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      PRIMARY KEY ("sid")
    ) WITH (OIDS=FALSE);
    
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Session table initialized in Neon');
  } catch (err) {
    console.error('❌ Failed to initialize session table:', err.message);
  }
}

module.exports = {
  createNeonSessionStore,
  initializeSessionTable
};
