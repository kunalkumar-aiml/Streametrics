const express = require('express');
const { getMovies, watchMovie, addFavorite, removeFavorite, getFavorites, searchMovies } = require('../controllers/movieController');

const router = express.Router();

router.get('/movies', getMovies);
router.post('/watch', watchMovie);
router.get('/search', searchMovies);
router.get('/favorites', getFavorites);
router.post('/favorites', addFavorite);
router.post('/favorites/remove', removeFavorite);

module.exports = router;
