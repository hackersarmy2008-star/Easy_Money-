const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase, pool } = require('./api/db');
const { register, login, authenticateToken } = require('./api/auth');
const { initiateRecharge, confirmRecharge, initiateWithdraw, getTransactions } = require('./api/payment');

const app = express();
const PORT = 5000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use(express.static('.', {
  extensions: ['html'],
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, phone, balance, total_recharge, total_withdraw, total_welfare, referral_code 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/user/checkin', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = await pool.query(
      'SELECT id FROM checkins WHERE user_id = $1 AND checkin_date = $2',
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const bonus = Math.floor(Math.random() * 51) + 10;

    await pool.query('BEGIN');

    await pool.query(
      'INSERT INTO checkins (user_id, amount, checkin_date) VALUES ($1, $2, $3)',
      [userId, bonus, today]
    );

    await pool.query(
      'UPDATE users SET balance = balance + $1, total_welfare = total_welfare + $1 WHERE id = $2',
      [bonus, userId]
    );

    await pool.query('COMMIT');

    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);

    res.json({
      message: 'Check-in successful!',
      bonus,
      balance: userResult.rows[0].balance
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

app.post('/api/payment/recharge', authenticateToken, initiateRecharge);
app.post('/api/payment/recharge/confirm', authenticateToken, confirmRecharge);
app.post('/api/payment/withdraw', authenticateToken, initiateWithdraw);
app.get('/api/transactions', authenticateToken, getTransactions);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'login.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, HOST, () => {
      console.log(`Backend server running at http://${HOST}:${PORT}/`);
      console.log('API endpoints available at /api/*');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
