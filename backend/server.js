const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', movieRoutes);
app.use('/api', userRoutes);

app.get('/', (_, res) => {
  return res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.use('/', express.static(path.join(__dirname, '../frontend')));

app.get('/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, message: 'Server and DB connection are healthy' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'DB unavailable', error: error.message });
  }
});

async function ensureSeedMovies() {
  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM movies');
  const total = countRows[0]?.total || 0;

  if (total < 10) {
    await pool.query('CALL seed_random_movies(?)', [10 - total]);
  }
}

async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    await ensureSeedMovies();

    app.listen(PORT, () => {
      console.log(`OTT backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  }
}

bootstrap();
