const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        total_recharge DECIMAL(10, 2) DEFAULT 0.00,
        total_withdraw DECIMAL(10, 2) DEFAULT 0.00,
        total_welfare DECIMAL(10, 2) DEFAULT 0.00,
        referral_code VARCHAR(10) UNIQUE NOT NULL,
        referred_by VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        upi_id VARCHAR(100),
        utr_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        checkin_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, checkin_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        plan_name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        daily_profit DECIMAL(10, 2) NOT NULL,
        total_profit DECIMAL(10, 2) NOT NULL,
        days INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        upi_id VARCHAR(100) UNIQUE NOT NULL,
        qr_position INTEGER UNIQUE NOT NULL,
        successful_payments INTEGER DEFAULT 0,
        max_payments_per_qr INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Initialize first QR if table is empty
    const qrCount = await pool.query('SELECT COUNT(*) FROM qr_codes');
    if (parseInt(qrCount.rows[0].count) === 0) {
      console.log('Initializing QR rotation system...');
      await pool.query(
        'INSERT INTO qr_codes (upi_id, qr_position, is_active) VALUES ($1, $2, $3)',
        ['merchant@upi', 1, true]
      );
      console.log('QR rotation system initialized with default QR');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = { pool, initDatabase };
