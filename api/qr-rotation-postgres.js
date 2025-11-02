const { pool } = require('./db-postgres');

async function getActiveQR() {
  const client = await pool.connect();
  try {
    let result = await client.query(
      'SELECT * FROM qr_codes WHERE is_active = 1 ORDER BY qr_position LIMIT 1'
    );

    if (result.rows.length === 0) {
      const firstQR = await client.query(
        'SELECT * FROM qr_codes ORDER BY qr_position LIMIT 1'
      );
      
      if (firstQR.rows.length > 0) {
        await client.query(
          'UPDATE qr_codes SET is_active = 1 WHERE id = $1',
          [firstQR.rows[0].id]
        );
        return firstQR.rows[0];
      }
      
      throw new Error('No QR codes available');
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function rotateQR() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentQRResult = await client.query(
      'SELECT * FROM qr_codes WHERE is_active = 1 ORDER BY qr_position LIMIT 1'
    );

    if (currentQRResult.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const currentQR = currentQRResult.rows[0];

    await client.query(
      'UPDATE qr_codes SET is_active = 0 WHERE id = $1',
      [currentQR.id]
    );

    let nextQRResult = await client.query(
      'SELECT * FROM qr_codes WHERE qr_position > $1 ORDER BY qr_position LIMIT 1',
      [currentQR.qr_position]
    );

    if (nextQRResult.rows.length === 0) {
      nextQRResult = await client.query(
        'SELECT * FROM qr_codes ORDER BY qr_position LIMIT 1'
      );
    }

    if (nextQRResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('No QR codes available for rotation');
    }

    const nextQR = nextQRResult.rows[0];

    await client.query(
      'UPDATE qr_codes SET is_active = 1, successful_payments = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [nextQR.id]
    );

    await client.query('COMMIT');
    console.log(`QR rotated from position ${currentQR.qr_position} to ${nextQR.qr_position}`);
    return nextQR;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function incrementPaymentAndRotate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const qrResult = await client.query(
      'SELECT * FROM qr_codes WHERE is_active = 1 ORDER BY qr_position LIMIT 1'
    );

    if (qrResult.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const qr = qrResult.rows[0];

    await client.query(
      'UPDATE qr_codes SET successful_payments = successful_payments + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [qr.id]
    );

    await client.query('COMMIT');

    const newCount = qr.successful_payments + 1;

    if (newCount >= qr.max_payments_per_qr) {
      console.log(`QR ${qr.qr_position} reached ${newCount} payments. Rotating...`);
      await rotateQR();
    } else {
      console.log(`QR ${qr.qr_position} now has ${newCount}/${qr.max_payments_per_qr} payments`);
    }

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getActiveQR,
  rotateQR,
  incrementPaymentAndRotate
};
