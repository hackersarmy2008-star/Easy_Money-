const { pool } = require('./db');

// Get the current active QR code
async function getActiveQR() {
  const result = await pool.query(
    'SELECT * FROM qr_codes WHERE is_active = true ORDER BY qr_position LIMIT 1'
  );

  if (result.rows.length === 0) {
    // If no active QR, activate the first one
    const firstQR = await pool.query(
      'SELECT * FROM qr_codes ORDER BY qr_position LIMIT 1'
    );
    
    if (firstQR.rows.length > 0) {
      await pool.query(
        'UPDATE qr_codes SET is_active = true WHERE id = $1',
        [firstQR.rows[0].id]
      );
      return firstQR.rows[0];
    }
    
    throw new Error('No QR codes available');
  }

  return result.rows[0];
}

// Rotate to next QR code
async function rotateQR() {
  await pool.query('BEGIN');

  try {
    // Get current active QR
    const currentQR = await pool.query(
      'SELECT * FROM qr_codes WHERE is_active = true ORDER BY qr_position LIMIT 1'
    );

    if (currentQR.rows.length === 0) {
      await pool.query('ROLLBACK');
      return null;
    }

    const current = currentQR.rows[0];

    // Deactivate current QR
    await pool.query(
      'UPDATE qr_codes SET is_active = false WHERE id = $1',
      [current.id]
    );

    // Get next QR
    let nextQR = await pool.query(
      'SELECT * FROM qr_codes WHERE qr_position > $1 ORDER BY qr_position LIMIT 1',
      [current.qr_position]
    );

    // If no next QR, loop back to first
    if (nextQR.rows.length === 0) {
      nextQR = await pool.query(
        'SELECT * FROM qr_codes ORDER BY qr_position LIMIT 1'
      );
    }

    if (nextQR.rows.length === 0) {
      await pool.query('ROLLBACK');
      throw new Error('No QR codes available for rotation');
    }

    // Activate next QR
    await pool.query(
      'UPDATE qr_codes SET is_active = true, successful_payments = 0, updated_at = NOW() WHERE id = $1',
      [nextQR.rows[0].id]
    );

    await pool.query('COMMIT');

    console.log(`QR rotated from position ${current.qr_position} to ${nextQR.rows[0].qr_position}`);
    return nextQR.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Increment payment count and rotate if needed
async function incrementPaymentAndRotate() {
  await pool.query('BEGIN');

  try {
    // Get current active QR
    const currentQR = await pool.query(
      'SELECT * FROM qr_codes WHERE is_active = true ORDER BY qr_position LIMIT 1'
    );

    if (currentQR.rows.length === 0) {
      await pool.query('ROLLBACK');
      return null;
    }

    const qr = currentQR.rows[0];

    // Increment successful payments
    await pool.query(
      'UPDATE qr_codes SET successful_payments = successful_payments + 1, updated_at = NOW() WHERE id = $1',
      [qr.id]
    );

    const newCount = qr.successful_payments + 1;

    await pool.query('COMMIT');

    // Check if rotation is needed
    if (newCount >= qr.max_payments_per_qr) {
      console.log(`QR ${qr.qr_position} reached ${newCount} payments. Rotating...`);
      await rotateQR();
    } else {
      console.log(`QR ${qr.qr_position} now has ${newCount}/${qr.max_payments_per_qr} payments`);
    }

    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Add new QR code
async function addQRCode(upiId) {
  const maxPosition = await pool.query(
    'SELECT COALESCE(MAX(qr_position), 0) as max_pos FROM qr_codes'
  );
  
  const newPosition = maxPosition.rows[0].max_pos + 1;

  const result = await pool.query(
    `INSERT INTO qr_codes (upi_id, qr_position) 
     VALUES ($1, $2) 
     RETURNING *`,
    [upiId, newPosition]
  );

  return result.rows[0];
}

// Get all QR codes
async function getAllQRCodes() {
  const result = await pool.query(
    'SELECT * FROM qr_codes ORDER BY qr_position'
  );
  return result.rows;
}

// Update QR code
async function updateQRCode(id, upiId) {
  const result = await pool.query(
    'UPDATE qr_codes SET upi_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [upiId, id]
  );
  return result.rows[0];
}

// Delete QR code
async function deleteQRCode(id) {
  await pool.query('DELETE FROM qr_codes WHERE id = $1', [id]);
  return true;
}

// Get QR rotation stats
async function getQRStats() {
  const activeQR = await pool.query(
    'SELECT * FROM qr_codes WHERE is_active = true LIMIT 1'
  );

  const totalQRs = await pool.query(
    'SELECT COUNT(*) as count FROM qr_codes'
  );

  const totalPayments = await pool.query(
    'SELECT SUM(successful_payments) as total FROM qr_codes'
  );

  return {
    activeQR: activeQR.rows[0] || null,
    totalQRs: parseInt(totalQRs.rows[0].count),
    totalPayments: parseInt(totalPayments.rows[0].total || 0)
  };
}

module.exports = {
  getActiveQR,
  rotateQR,
  incrementPaymentAndRotate,
  addQRCode,
  getAllQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRStats
};
