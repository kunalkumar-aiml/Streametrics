const pool = require('../db');

async function getWatchHistory(req, res) {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const [history] = await pool.query(
      `SELECT 
          wh.history_id,
          wh.watch_timestamp,
          m.movie_id,
          m.title,
          m.poster_url,
          m.rating,
          m.duration
       FROM watch_history wh
       INNER JOIN movies m ON wh.movie_id = m.movie_id
       WHERE wh.user_id = ?
       ORDER BY wh.watch_timestamp DESC
       LIMIT 30`,
      [userId]
    );

    return res.json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch watch history', error: error.message });
  }
}

async function getNotifications(req, res) {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const [notifications] = await pool.query(
      `SELECT notification_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch notifications', error: error.message });
  }
}

module.exports = { getWatchHistory, getNotifications };
