const pool = require('../db');

async function getMovies(req, res) {
  try {
    const [movies] = await pool.query(
      `SELECT 
          m.movie_id,
          m.title,
          GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') AS genre,
          m.release_year,
          m.duration,
          m.rating,
          m.description,
          m.poster_url,
          IFNULL(tr.watch_count, 0) AS watch_count
       FROM movies m
       LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.genre_id
       LEFT JOIN (
          SELECT movie_id, COUNT(*) AS watch_count
          FROM watch_history
          GROUP BY movie_id
       ) tr ON tr.movie_id = m.movie_id
       GROUP BY m.movie_id
       ORDER BY watch_count DESC, m.created_at DESC`
    );

    return res.json({ success: true, movies });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch movies', error: error.message });
  }
}

async function watchMovie(req, res) {
  try {
    const { user_id, movie_id } = req.body;

    if (!user_id || !movie_id) {
      return res.status(400).json({ success: false, message: 'user_id and movie_id are required' });
    }

    await pool.query(
      `INSERT INTO watch_history (user_id, movie_id, watch_timestamp, progress_percent)
       VALUES (?, ?, NOW(), 100)`,
      [user_id, movie_id]
    );

    await pool.query(
      `INSERT INTO recommendations (user_id, movie_id, score, reason)
       VALUES (?, ?, ROUND(RAND() * 5 + 5, 2), 'Because you watched similar content')
       ON DUPLICATE KEY UPDATE score = VALUES(score), reason = VALUES(reason), created_at = NOW()`,
      [user_id, movie_id]
    );

    return res.json({ success: true, message: 'Playback simulated and watch history saved' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to store watch event', error: error.message });
  }
}

module.exports = { getMovies, watchMovie };
