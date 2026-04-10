const pool = require('../db');

const VALID_USERNAME = '9341806005';
const VALID_PASSWORD = '9341806005';

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const [users] = await pool.query('SELECT user_id, username, full_name FROM users WHERE username = ?', [username]);
    let user = users[0];

    if (!user) {
      const [result] = await pool.query(
        `INSERT INTO users (username, password_hash, full_name, email, last_login)
         VALUES (?, SHA2(?, 256), ?, ?, NOW())`,
        [username, password, 'Demo User', 'demo@ott.local']
      );

      user = {
        user_id: result.insertId,
        username,
        full_name: 'Demo User',
      };

      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, status)
         VALUES (?, 'Premium', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active')`,
        [user.user_id]
      );
    } else {
      await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
    }

    await pool.query(
      `INSERT INTO login_activity (user_id, login_timestamp, ip_address, device_info, success)
       VALUES (?, NOW(), ?, ?, TRUE)`,
      [user.user_id, req.ip || '0.0.0.0', req.headers['user-agent'] || 'unknown-device']
    );

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
}

module.exports = { login };
