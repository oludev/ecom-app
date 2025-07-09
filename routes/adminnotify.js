// routes/user/usernotify.js
const express = require('express');
const router = express.Router();
const { getAdminNotifications } = require('../controllers/adminnotifyCtrlFile');

router.get('/notifications', getAdminNotifications);

module.exports = router;