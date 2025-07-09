// routes/user/usernotify.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../controllers/auth');
const { getUserNotifications, clearNotifications
 } = require('../controllers/usernotifyCtrlFile');

router.get('/', isLoggedIn, getUserNotifications);

// Clear all notifications
router.post('/clear', isLoggedIn, clearNotifications);


module.exports = router;


