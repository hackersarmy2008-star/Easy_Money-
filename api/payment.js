const { pool } = require('./db');

const CUSTOM_UPI_ID = process.env.CUSTOM_UPI_ID || 'merchant@upi';

async function initiateRecharge(req, res) {
  const { amount } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
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
      upiId: CUSTOM_UPI_ID,
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

    await pool.query('BEGIN');

    await pool.query(
      'UPDATE transactions SET status = $1, utr_number = $2 WHERE id = $3',
      ['completed', utrNumber, transactionId]
    );

    const amount = parseFloat(transaction.rows[0].amount);
    await pool.query(
      'UPDATE users SET balance = balance + $1, total_recharge = total_recharge + $1 WHERE id = $2',
      [amount, userId]
    );

    await pool.query('COMMIT');

    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);

    res.json({
      message: 'Recharge confirmed successfully',
      balance: userResult.rows[0].balance
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Confirm recharge error:', error);
    res.status(500).json({ error: 'Failed to confirm recharge' });
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
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
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
  initiateWithdraw,
  getTransactions
};
