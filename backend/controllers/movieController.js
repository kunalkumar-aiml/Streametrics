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

// --- Favorites ---
async function addFavorite(req, res) {
  try {
    const { user_id, movie_id } = req.body;
    if (!user_id || !movie_id) {
      return res.status(400).json({ success: false, message: 'user_id and movie_id are required' });
    }

    await pool.query(
      `INSERT IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)`,
      [user_id, movie_id]
    );

    // Also generate a notification so DB activity is visible
    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES (?, 'general', ?)`,
      [user_id, `You added a movie to your favourites list.`]
    );

    return res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to add favorite', error: error.message });
  }
}

async function removeFavorite(req, res) {
  try {
    const { user_id, movie_id } = req.body;
    if (!user_id || !movie_id) {
      return res.status(400).json({ success: false, message: 'user_id and movie_id are required' });
    }

    await pool.query(
      `DELETE FROM favorites WHERE user_id = ? AND movie_id = ?`,
      [user_id, movie_id]
    );

    return res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to remove favorite', error: error.message });
  }
}

async function getFavorites(req, res) {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const [favorites] = await pool.query(
      `SELECT f.favorite_id, f.movie_id, m.title, m.poster_url, m.rating, m.release_year, m.duration,
              GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') AS genre
       FROM favorites f
       INNER JOIN movies m ON f.movie_id = m.movie_id
       LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.genre_id
       WHERE f.user_id = ?
       GROUP BY f.favorite_id
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, favorites });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch favorites', error: error.message });
  }
}

// --- Search (server-side with DB query) ---
async function searchMovies(req, res) {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.json({ success: true, results: [] });
    }

    const [results] = await pool.query(
      `SELECT 
          m.movie_id, m.title,
          GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') AS genre,
          m.release_year, m.duration, m.rating, m.poster_url,
          IFNULL(tr.watch_count, 0) AS watch_count
       FROM movies m
       LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.genre_id
       LEFT JOIN (
          SELECT movie_id, COUNT(*) AS watch_count
          FROM watch_history GROUP BY movie_id
       ) tr ON tr.movie_id = m.movie_id
       WHERE m.title LIKE ? OR g.name LIKE ?
       GROUP BY m.movie_id
       ORDER BY m.rating DESC`,
      [`%${query}%`, `%${query}%`]
    );

    return res.json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Search failed', error: error.message });
  }
}

module.exports = { getMovies, watchMovie, addFavorite, removeFavorite, getFavorites, searchMovies };
