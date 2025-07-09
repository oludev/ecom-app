const db = require('../config/db');
const { getUnreadCountForUser } = require('../utils/notify'); // Import utility to get updated count

// Fetch notifications for logged-in user
exports.getUserNotifications = async (req, res) => {
  const userId = req.session.userData?.id;
  console.log('User ID for /notifications:', userId);

  if (!userId) {
    return res.redirect('/auth/login');
  }

  try {
    // 1. Fetch notifications
    const [notifications] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ? AND role = 'user' ORDER BY created_at DESC`,
      [userId]
    );
    console.log('Notifications fetched:', notifications);

    // 2. Mark all currently viewed user notifications as read
    // This assumes that loading the page means the user has seen these notifications.
    await db.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND role = 'user' AND is_read = 0`, [userId]);

    // 3. Update user's unread count in session after marking as read
    if (req.session.userData) {
      req.session.userData.unreadCount = await getUnreadCountForUser(userId);
    }

    // 4. Emit updated count to the specific user's connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit(`notification_user_${userId}`, {
        unreadCount: req.session.userData ? req.session.userData.unreadCount : 0 // Send updated count
      });
    }

    res.render('users/notifications', {
      notifications,
      layout: 'main',
      user: req.session.userData // Ensure the user object (with updated unreadCount) is passed to the view
    });
  } catch (err) {
    console.error('Notifications Error:', err);
    // Render with empty notifications and error message, still pass user session and layout
    res.render('users/notifications', {
      notifications: [],
      error: 'Failed to load notifications.',
      layout: 'main',
      user: req.session.userData
    });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    const userId = req.session.userData.id;

    await req.db.query(
      `DELETE FROM notifications WHERE user_id = ? AND role = 'user'`,
      [userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Clear notification error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

