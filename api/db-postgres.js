const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        total_recharge DECIMAL(10, 2) DEFAULT 0.00,
        total_withdraw DECIMAL(10, 2) DEFAULT 0.00,
        total_welfare DECIMAL(10, 2) DEFAULT 0.00,
        referral_code VARCHAR(20) UNIQUE NOT NULL,
        referred_by VARCHAR(20),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        upi_id VARCHAR(100),
        utr_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        checkin_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, checkin_date)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        daily_profit DECIMAL(10, 2) NOT NULL,
        total_profit DECIMAL(10, 2) NOT NULL,
        days INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        upi_id VARCHAR(100) UNIQUE NOT NULL,
        qr_position INTEGER UNIQUE NOT NULL,
        successful_payments INTEGER DEFAULT 0,
        max_payments_per_qr INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const qrCountResult = await client.query('SELECT COUNT(*) as count FROM qr_codes');
    const qrCount = parseInt(qrCountResult.rows[0].count);

    if (qrCount === 0) {
      console.log('Initializing QR rotation system with 7 UPI IDs...');
      
      const upiIds = [
        'hacker-shaw@fam',
        'jadhavnitin6@bpunity',
        'aryansinghthakurrajput-1@okhdfcbank',
        'dheerajya799-20@okicici',
        'sangeetaya79@okicici',
        'Manjughazipur7575-3@okhdfcbank',
        'tanishqsonkar91400-1@okaxis'
      ];

      for (let index = 0; index < upiIds.length; index++) {
        await client.query(
          'INSERT INTO qr_codes (upi_id, qr_position, is_active) VALUES ($1, $2, $3)',
          [upiIds[index], index + 1, index === 0 ? 1 : 0]
        );
      }
      console.log('QR rotation system initialized with 7 UPI IDs');
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
