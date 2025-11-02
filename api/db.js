const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance REAL DEFAULT 0.00,
        total_recharge REAL DEFAULT 0.00,
        total_withdraw REAL DEFAULT 0.00,
        total_welfare REAL DEFAULT 0.00,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        upi_id TEXT,
        utr_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        checkin_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, checkin_date)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_name TEXT NOT NULL,
        amount REAL NOT NULL,
        daily_profit REAL NOT NULL,
        total_profit REAL NOT NULL,
        days INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upi_id TEXT UNIQUE NOT NULL,
        qr_position INTEGER UNIQUE NOT NULL,
        successful_payments INTEGER DEFAULT 0,
        max_payments_per_qr INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const qrCount = db.prepare('SELECT COUNT(*) as count FROM qr_codes').get();
    if (qrCount.count === 0) {
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

      const insertQR = db.prepare(
        'INSERT INTO qr_codes (upi_id, qr_position, is_active) VALUES (?, ?, ?)'
      );

      const insertMany = db.transaction((codes) => {
        codes.forEach((code, index) => {
          insertQR.run(code, index + 1, index === 0 ? 1 : 0);
        });
      });

      insertMany(upiIds);
      console.log('QR rotation system initialized with 7 UPI IDs');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = { db, initDatabase };
