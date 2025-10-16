const { pool } = require('./db');
const { getActiveQR, incrementPaymentAndRotate } = require('./qr-rotation');

async function initiateRecharge(req, res) {
  const { amount } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Get current active QR code
    const activeQR = await getActiveQR();

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, 'recharge', amount, 'pending']
    );

    const transactionId = result.rows[0].id;

    res.json({
      message: 'Recharge initiated',
      transactionId,
      upiId: activeQR.upi_id,
      qrPosition: activeQR.qr_position,
      amount,
      instructions: 'Please pay to the UPI ID provided and submit UTR number to confirm'
    });
  } catch (error) {
    console.error('Recharge error:', error);
    res.status(500).json({ error: 'Failed to initiate recharge' });
  }
}

async function confirmRecharge(req, res) {
  const { transactionId, utrNumber } = req.body;
  const userId = req.user.userId;

  if (!transactionId || !utrNumber) {
    return res.status(400).json({ error: 'Transaction ID and UTR number are required' });
  }

  try {
    const transaction = await pool.query(
      'SELECT id, amount, status FROM transactions WHERE id = $1 AND user_id = $2 AND type = $3',
      [transactionId, userId, 'recharge']
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    await pool.query(
      'UPDATE transactions SET status = $1, utr_number = $2 WHERE id = $3',
      ['verification_pending', utrNumber, transactionId]
    );

    // Note: In production, you would verify the UTR with payment gateway
    // For demo, we'll track this as a pending payment
    // When admin approves, they should call the approve endpoint which will increment QR counter

    res.json({
      message: 'UTR submitted successfully. Your recharge will be verified and processed within 24 hours.',
      note: 'Admin verification required before balance is credited'
    });
  } catch (error) {
    console.error('Confirm recharge error:', error);
    res.status(500).json({ error: 'Failed to submit UTR' });
  }
}

// Admin: Approve recharge and rotate QR if needed
async function approveRecharge(req, res) {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const transaction = await pool.query(
      'SELECT id, user_id, amount, status FROM transactions WHERE id = $1 AND type = $2',
      [transactionId, 'recharge']
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Transaction already approved' });
    }

    await pool.query('BEGIN');

    // Update transaction status
    await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['completed', transactionId]
    );

    // Credit user balance
    const amount = parseFloat(transaction.rows[0].amount);
    await pool.query(
      'UPDATE users SET balance = balance + $1, total_recharge = total_recharge + $1 WHERE id = $2',
      [amount, transaction.rows[0].user_id]
    );

    await pool.query('COMMIT');

    // Increment QR payment count and rotate if needed
    await incrementPaymentAndRotate();

    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [transaction.rows[0].user_id]);

    res.json({
      message: 'Recharge approved successfully',
      balance: userResult.rows[0].balance
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Approve recharge error:', error);
    res.status(500).json({ error: 'Failed to approve recharge' });
  }
}

async function initiateWithdraw(req, res) {
  const { amount, upiId } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!upiId) {
    return res.status(400).json({ error: 'UPI ID is required' });
  }

  try {
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
    const currentBalance = parseFloat(userResult.rows[0].balance);

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await pool.query('BEGIN');

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, upi_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [userId, 'withdraw', amount, 'pending', upiId]
    );

    await pool.query(
      'UPDATE users SET balance = balance - $1, total_withdraw = total_withdraw + $1 WHERE id = $2',
      [amount, userId]
    );

    await pool.query('COMMIT');

    const updatedBalance = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);

    res.json({
      message: 'Withdrawal request submitted successfully',
      transactionId: result.rows[0].id,
      balance: updatedBalance.rows[0].balance,
      note: 'Your withdrawal will be processed within 24 hours'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
}

async function getTransactions(req, res) {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT id, type, amount, status, upi_id, utr_number, created_at 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

module.exports = {
  initiateRecharge,
  confirmRecharge,
  approveRecharge,
  initiateWithdraw,
  getTransactions
};
