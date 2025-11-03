const { db } = require('./db');
const { getActiveQR, incrementPaymentAndRotate } = require('./qr-rotation');

async function initiateRecharge(req, res) {
  const { amount } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const activeQR = getActiveQR();

    const result = db.prepare(
      `INSERT INTO transactions (user_id, type, amount, status) 
       VALUES (?, ?, ?, ?)`
    ).run(userId, 'recharge', amount, 'pending');

    const transactionId = result.lastInsertRowid;

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
    const transaction = db.prepare(
      'SELECT id, amount, status FROM transactions WHERE id = ? AND user_id = ? AND type = ?'
    ).get(transactionId, userId, 'recharge');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    db.prepare(
      'UPDATE transactions SET status = ?, utr_number = ? WHERE id = ?'
    ).run('verification_pending', utrNumber, transactionId);

    res.json({
      message: 'UTR submitted successfully. Your recharge will be verified and processed within 24 hours.',
      note: 'Admin verification required before balance is credited'
    });
  } catch (error) {
    console.error('Confirm recharge error:', error);
    res.status(500).json({ error: 'Failed to submit UTR' });
  }
}

async function approveRecharge(req, res) {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const transaction = db.prepare(
      'SELECT id, user_id, amount, status FROM transactions WHERE id = ? AND type = ?'
    ).get(transactionId, 'recharge');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ error: 'Transaction already approved' });
    }

    const approveTransaction = db.transaction(() => {
      db.prepare(
        'UPDATE transactions SET status = ? WHERE id = ?'
      ).run('completed', transactionId);

      const amount = parseFloat(transaction.amount);
      db.prepare(
        'UPDATE users SET balance = balance + ?, total_recharge = total_recharge + ? WHERE id = ?'
      ).run(amount, amount, transaction.user_id);
    });

    approveTransaction();

    incrementPaymentAndRotate();

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(transaction.user_id);

    res.json({
      message: 'Recharge approved successfully',
      balance: user.balance
    });
  } catch (error) {
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

  if (amount < 300) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is ₹300' });
  }

  if (!upiId) {
    return res.status(400).json({ error: 'UPI ID is required' });
  }

  try {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
    const currentBalance = parseFloat(user.balance);

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const withdrawTransaction = db.transaction(() => {
      const result = db.prepare(
        `INSERT INTO transactions (user_id, type, amount, status, upi_id) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, 'withdraw', amount, 'pending', upiId);

      db.prepare(
        'UPDATE users SET balance = balance - ?, total_withdraw = total_withdraw + ? WHERE id = ?'
      ).run(amount, amount, userId);

      return result.lastInsertRowid;
    });

    const transactionId = withdrawTransaction();

    const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Withdrawal request submitted successfully',
      transactionId: transactionId,
      balance: updatedUser.balance,
      note: 'Your withdrawal will be processed within 24 hours'
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
}

async function getTransactions(req, res) {
  const userId = req.user.userId;

  try {
    const result = db.prepare(
      `SELECT id, type, amount, status, upi_id, utr_number, created_at 
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    ).all(userId);

    res.json({ transactions: result });
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
