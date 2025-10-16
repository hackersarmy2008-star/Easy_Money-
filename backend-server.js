const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase, pool } = require('./api/db');
const { register, login, authenticateToken } = require('./api/auth');
const { initiateRecharge, confirmRecharge, approveRecharge, initiateWithdraw, getTransactions } = require('./api/payment');
const { getActiveQR, addQRCode, getAllQRCodes, updateQRCode, deleteQRCode, getQRStats, rotateQR } = require('./api/qr-rotation');

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

// Admin QR management endpoints
app.get('/api/admin/qr/stats', async (req, res) => {
  try {
    const stats = await getQRStats();
    res.json(stats);
  } catch (error) {
    console.error('QR stats error:', error);
    res.status(500).json({ error: 'Failed to fetch QR stats' });
  }
});

app.get('/api/admin/qr/all', async (req, res) => {
  try {
    const qrCodes = await getAllQRCodes();
    res.json({ qrCodes });
  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

app.post('/api/admin/qr/add', async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    const qrCode = await addQRCode(upiId);
    res.json({ message: 'QR code added successfully', qrCode });
  } catch (error) {
    console.error('Add QR error:', error);
    res.status(500).json({ error: 'Failed to add QR code' });
  }
});

app.put('/api/admin/qr/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { upiId } = req.body;
    if (!upiId) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }
    const qrCode = await updateQRCode(id, upiId);
    res.json({ message: 'QR code updated successfully', qrCode });
  } catch (error) {
    console.error('Update QR error:', error);
    res.status(500).json({ error: 'Failed to update QR code' });
  }
});

app.delete('/api/admin/qr/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQRCode(id);
    res.json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Delete QR error:', error);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
});

app.post('/api/admin/qr/rotate', async (req, res) => {
  try {
    const nextQR = await rotateQR();
    res.json({ message: 'QR rotated successfully', nextQR });
  } catch (error) {
    console.error('Rotate QR error:', error);
    res.status(500).json({ error: 'Failed to rotate QR' });
  }
});

app.post('/api/admin/recharge/approve', approveRecharge);

app.get('/api/admin/transactions/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.phone 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.type = 'recharge' AND t.status = 'verification_pending' 
       ORDER BY t.created_at DESC`
    );
    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

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
