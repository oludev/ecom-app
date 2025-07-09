const db = require('../config/db');
const { getUnreadCountForAdmin } = require('../utils/notify'); // Import utility to get updated count

// Admin notification page
exports.getAdminNotifications = async (req, res) => {
    try {
        // Fetch notifications
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE role = ? AND user_id IS NULL ORDER BY created_at DESC',
            ['admin']
        );

        // Mark all currently viewed admin notifications as read
        // This assumes that loading the page means the admin has seen these notifications.
        await db.query(`UPDATE notifications SET is_read = 1 WHERE role = 'admin' AND is_read = 0`);

        // Update admin's unread count in session after marking as read
        if (req.session.admin) {
            req.session.admin.unreadCount = await getUnreadCountForAdmin();
        }

        // Emit updated count to all connected clients (especially other admin sessions)
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_admin', {
                unreadCount: req.session.admin ? req.session.admin.unreadCount : 0 // Send updated count
            });
        }

        res.render('admin/notifications', {
            notifications,
            admin: req.session.admin // Ensure the admin object (with updated unreadCount) is passed to the view
        });

    } catch (error) {
        console.error('Admin notifications fetch failed:', error);
        // On error, render with empty notifications and error message, still pass admin session
        res.status(500).render('admin/notifications', {
            notifications: [],
            error: 'Error loading notifications',
            admin: req.session.admin
        });
    }
};