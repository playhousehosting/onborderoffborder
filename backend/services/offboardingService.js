const { Pool } = require('pg');

let pool = null;

// Initialize database connection using environment variable
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Neon uses SSL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Initialize the scheduled_offboardings table
async function initializeTable() {
  const pool = getPool();
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS scheduled_offboardings (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_display_name VARCHAR(500),
      user_email VARCHAR(500),
      scheduled_date DATE NOT NULL,
      scheduled_time TIME NOT NULL,
      scheduled_date_time TIMESTAMPTZ,
      template VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'scheduled',
      manager_email VARCHAR(500),
      notify_manager BOOLEAN DEFAULT true,
      notify_user BOOLEAN DEFAULT true,
      custom_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      executed_at TIMESTAMPTZ,
      created_by VARCHAR(255)
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_status ON scheduled_offboardings (status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_scheduled_date ON scheduled_offboardings (scheduled_date_time);
    CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_user_id ON scheduled_offboardings (user_id);
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Scheduled offboardings table initialized');
  } catch (err) {
    console.error('❌ Failed to initialize scheduled offboardings table:', err.message);
    throw err;
  }
}

async function list() {
  const pool = getPool();
  await initializeTable();
  
  const query = `
    SELECT 
      id,
      user_id,
      user_display_name,
      user_email,
      scheduled_date,
      scheduled_time,
      scheduled_date_time,
      template,
      status,
      manager_email,
      notify_manager,
      notify_user,
      custom_message,
      created_at,
      executed_at
    FROM scheduled_offboardings
    ORDER BY scheduled_date_time ASC
  `;

  const result = await pool.query(query);
  return result.rows.map(formatScheduleFromDb);
}

async function get(id) {
  const pool = getPool();
  await initializeTable();
  
  const query = `
    SELECT * FROM scheduled_offboardings WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? formatScheduleFromDb(result.rows[0]) : null;
}

async function create(schedule) {
  const pool = getPool();
  await initializeTable();
  
  const id = Date.now().toString() + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  
  // Extract user info from the user object if provided
  const user = schedule.user || {};
  const userId = schedule.userId || user.id;
  const userDisplayName = user.displayName || schedule.userDisplayName;
  const userEmail = user.mail || user.email || schedule.userEmail;
  
  // Parse scheduled date/time
  const scheduledDateTime = schedule.scheduledDateTime || 
    (schedule.scheduledDate && schedule.scheduledTime ? 
      `${schedule.scheduledDate}T${schedule.scheduledTime}:00Z` : null);

  const query = `
    INSERT INTO scheduled_offboardings (
      id, user_id, user_display_name, user_email, scheduled_date, scheduled_time, 
      scheduled_date_time, template, status, manager_email, notify_manager, 
      notify_user, custom_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [
    id,
    userId,
    userDisplayName,
    userEmail,
    schedule.scheduledDate,
    schedule.scheduledTime,
    scheduledDateTime,
    schedule.template || 'standard',
    'scheduled',
    schedule.managerEmail,
    schedule.notifyManager !== false,
    schedule.notifyUser !== false,
    schedule.customMessage,
    now
  ];

  const result = await pool.query(query, values);
  return formatScheduleFromDb(result.rows[0]);
}

async function update(id, updates) {
  const pool = getPool();
  await initializeTable();
  
  // Build dynamic update query
  const updateFields = [];
  const values = [id]; // $1 will be the id
  let paramIndex = 2;

  // Add fields that can be updated
  const allowedFields = [
    'scheduled_date', 'scheduled_time', 'scheduled_date_time', 'template',
    'manager_email', 'notify_manager', 'notify_user', 'custom_message'
  ];

  for (const field of allowedFields) {
    const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (updates[camelField] !== undefined) {
      updateFields.push(`${field} = $${paramIndex}`);
      values.push(updates[camelField]);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const query = `
    UPDATE scheduled_offboardings 
    SET ${updateFields.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? formatScheduleFromDb(result.rows[0]) : null;
}

async function remove(id) {
  const pool = getPool();
  await initializeTable();
  
  const query = `DELETE FROM scheduled_offboardings WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
}

async function execute(id) {
  const pool = getPool();
  await initializeTable();
  
  const executedAt = new Date().toISOString();
  const query = `
    UPDATE scheduled_offboardings 
    SET status = 'completed', executed_at = $2
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id, executedAt]);
  return result.rows.length > 0 ? formatScheduleFromDb(result.rows[0]) : null;
}

// Helper function to format database row to match frontend expectations
function formatScheduleFromDb(row) {
  return {
    id: row.id,
    user: {
      id: row.user_id,
      displayName: row.user_display_name,
      mail: row.user_email
    },
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    scheduledDateTime: row.scheduled_date_time,
    template: row.template,
    status: row.status,
    managerEmail: row.manager_email,
    notifyManager: row.notify_manager,
    notifyUser: row.notify_user,
    customMessage: row.custom_message,
    createdAt: row.created_at,
    executedAt: row.executed_at
  };
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  execute
};
