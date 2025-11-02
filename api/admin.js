const { pool } = require('./db-postgres');

function authenticateAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function getStats(req, res) {
  const client = await pool.connect();
  try {
    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    const balanceResult = await client.query('SELECT SUM(balance) as total FROM users');
    const rechargeResult = await client.query('SELECT SUM(total_recharge) as total FROM users');
    const withdrawResult = await client.query('SELECT SUM(total_withdraw) as total FROM users');

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalBalance: parseFloat(balanceResult.rows[0].total || 0).toFixed(2),
      totalRecharge: parseFloat(rechargeResult.rows[0].total || 0).toFixed(2),
      totalWithdraw: parseFloat(withdrawResult.rows[0].total || 0).toFixed(2)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  } finally {
    client.release();
  }
}

async function getAllUsers(req, res) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, phone, balance, total_recharge, total_withdraw, total_welfare, referral_code, referred_by, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    client.release();
  }
}

async function getAllTransactions(req, res) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, type, amount, status, upi_id, utr_number, created_at 
       FROM transactions 
       ORDER BY created_at DESC 
       LIMIT 200`
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  } finally {
    client.release();
  }
}

async function getPendingPayments(req, res) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, type, amount, status, upi_id, utr_number, created_at 
       FROM transactions 
       WHERE status IN ('pending', 'verification_pending') 
       ORDER BY created_at DESC`
    );

    res.json({ pending: result.rows });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  } finally {
    client.release();
  }
}

async function approvePayment(req, res) {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      'SELECT id, user_id, amount, status, type FROM transactions WHERE id = $1',
      [transactionId]
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

    if (transaction.type === 'recharge') {
      const amount = parseFloat(transaction.amount);
      await client.query(
        'UPDATE users SET balance = balance + $1, total_recharge = total_recharge + $2 WHERE id = $3',
        [amount, amount, transaction.user_id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Payment approved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  } finally {
    client.release();
  }
}

async function rejectPayment(req, res) {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      'SELECT id, user_id, amount, status, type FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    await client.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['rejected', transactionId]
    );

    if (transaction.type === 'withdraw' && transaction.status !== 'completed') {
      const amount = parseFloat(transaction.amount);
      await client.query(
        'UPDATE users SET balance = balance + $1, total_withdraw = total_withdraw - $2 WHERE id = $3',
        [amount, amount, transaction.user_id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Payment rejected successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  } finally {
    client.release();
  }
}

module.exports = {
  authenticateAdmin,
  getStats,
  getAllUsers,
  getAllTransactions,
  getPendingPayments,
  approvePayment,
  rejectPayment
};
