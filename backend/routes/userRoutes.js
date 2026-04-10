const express = require('express');
const { getWatchHistory, getNotifications } = require('../controllers/userController');

const router = express.Router();

router.get('/watch-history', getWatchHistory);
router.get('/notifications', getNotifications);

module.exports = router;
