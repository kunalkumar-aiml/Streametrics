const express = require('express');
const { getMovies, watchMovie } = require('../controllers/movieController');

const router = express.Router();

router.get('/movies', getMovies);
router.post('/watch', watchMovie);

module.exports = router;
