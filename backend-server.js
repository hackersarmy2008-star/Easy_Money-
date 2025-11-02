const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase, db } = require('./api/db');
const { register, login, authenticateToken } = require('./api/auth');
const { initiateRecharge, confirmRecharge, initiateWithdraw, getTransactions, approveRecharge } = require('./api/payment');
const { authenticateAdmin, getStats, getAllUsers, getAllTransactions, getPendingPayments, approvePayment, rejectPayment } = require('./api/admin-sqlite');

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
    const result = db.prepare(
      `SELECT id, phone, balance, total_recharge, total_withdraw, total_welfare, referral_code 
       FROM users WHERE id = ?`
    ).get(req.user.userId);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/user/checkin', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = db.prepare(
      'SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?'
    ).get(userId, today);

    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const bonus = Math.floor(Math.random() * 51) + 10;

    const checkinTransaction = db.transaction(() => {
      db.prepare(
        'INSERT INTO checkins (user_id, amount, checkin_date) VALUES (?, ?, ?)'
      ).run(userId, bonus, today);

      db.prepare(
        'UPDATE users SET balance = balance + ?, total_welfare = total_welfare + ? WHERE id = ?'
      ).run(bonus, bonus, userId);
    });

    checkinTransaction();

    const userResult = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Check-in successful!',
      bonus,
      balance: userResult.balance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

app.post('/api/payment/recharge', authenticateToken, initiateRecharge);
app.post('/api/payment/recharge/confirm', authenticateToken, confirmRecharge);
app.post('/api/payment/withdraw', authenticateToken, initiateWithdraw);
app.get('/api/transactions', authenticateToken, getTransactions);

app.get('/api/admin/stats', authenticateToken, authenticateAdmin, getStats);
app.get('/api/admin/users', authenticateToken, authenticateAdmin, getAllUsers);
app.get('/api/admin/transactions', authenticateToken, authenticateAdmin, getAllTransactions);
app.get('/api/admin/pending', authenticateToken, authenticateAdmin, getPendingPayments);
app.post('/api/admin/approve', authenticateToken, authenticateAdmin, approvePayment);
app.post('/api/admin/reject', authenticateToken, authenticateAdmin, rejectPayment);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && req.method === 'GET') {
    res.sendFile(path.join(__dirname, 'login.html'));
  } else if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    next();
  }
});

function startServer() {
  try {
    initDatabase();
    app.listen(PORT, HOST, () => {
      console.log(`Backend server running at http://${HOST}:${PORT}/`);
      console.log('API endpoints available at /api/*');
      console.log('Using SQLite database with admin support');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
