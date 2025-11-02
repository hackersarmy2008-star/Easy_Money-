const { pool } = require('./db-postgres');
const { getActiveQR, incrementPaymentAndRotate } = require('./qr-rotation-postgres');

async function initiateRecharge(req, res) {
  const { amount } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const client = await pool.connect();
  try {
    const activeQR = await getActiveQR();

    const result = await client.query(
      `INSERT INTO transactions (user_id, type, amount, status) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
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
  } finally {
    client.release();
  }
}

async function confirmRecharge(req, res) {
  const { transactionId, utrNumber } = req.body;
  const userId = req.user.userId;

  if (!transactionId || !utrNumber) {
    return res.status(400).json({ error: 'Transaction ID and UTR number are required' });
  }

  const client = await pool.connect();
  try {
    const transactionResult = await client.query(
      'SELECT id, amount, status FROM transactions WHERE id = $1 AND user_id = $2 AND type = $3',
      [transactionId, userId, 'recharge']
    );

    if (transactionResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    if (transaction.status !== 'pending') {
      client.release();
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    await client.query(
      'UPDATE transactions SET status = $1, utr_number = $2 WHERE id = $3',
      ['verification_pending', utrNumber, transactionId]
    );

    res.json({
      message: 'UTR submitted successfully. Your recharge will be verified and processed within 24 hours.',
      note: 'Admin verification required before balance is credited'
    });
  } catch (error) {
    console.error('Confirm recharge error:', error);
    res.status(500).json({ error: 'Failed to submit UTR' });
  } finally {
    client.release();
  }
}

async function approveRecharge(req, res) {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      'SELECT id, user_id, amount, status FROM transactions WHERE id = $1 AND type = $2',
      [transactionId, 'recharge']
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    if (transaction.status === 'completed') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Transaction already approved' });
    }

    await client.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['completed', transactionId]
    );

    const amount = parseFloat(transaction.amount);
    await client.query(
      'UPDATE users SET balance = balance + $1, total_recharge = total_recharge + $2 WHERE id = $3',
      [amount, amount, transaction.user_id]
    );

    await client.query('COMMIT');

    await incrementPaymentAndRotate();

    const userResult = await client.query('SELECT balance FROM users WHERE id = $1', [transaction.user_id]);

    res.json({
      message: 'Recharge approved successfully',
      balance: parseFloat(userResult.rows[0].balance)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve recharge error:', error);
    res.status(500).json({ error: 'Failed to approve recharge' });
  } finally {
    client.release();
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
    const currentBalance = parseFloat(userResult.rows[0].balance);

    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const result = await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, upi_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, 'withdraw', amount, 'pending', upiId]
    );

    await client.query(
      'UPDATE users SET balance = balance - $1, total_withdraw = total_withdraw + $2 WHERE id = $3',
      [amount, amount, userId]
    );

    await client.query('COMMIT');

    const transactionId = result.rows[0].id;
    const updatedUserResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);

    res.json({
      message: 'Withdrawal request submitted successfully',
      transactionId: transactionId,
      balance: parseFloat(updatedUserResult.rows[0].balance),
      note: 'Your withdrawal will be processed within 24 hours'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  } finally {
    client.release();
  }
}

async function getTransactions(req, res) {
  const userId = req.user.userId;

  const client = await pool.connect();
  try {
    const result = await client.query(
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
  } finally {
    client.release();
  }
}

module.exports = {
  initiateRecharge,
  confirmRecharge,
  approveRecharge,
  initiateWithdraw,
  getTransactions
};
