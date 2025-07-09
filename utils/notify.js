const db = require('../config/db');

/**
 * Create a notification for a user or admin.
 *
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - 'order', 'system', 'alert', etc.
 * @param {number|null} user_id - ID of the user (null for admin)
 * @param {string} role - 'user' or 'admin'
 * @returns {Promise<number>} - Inserted notification ID
 */
exports.createNotification = async (title, message, type = 'system', user_id = null, role = 'user') => {
  const query = `
    INSERT INTO notifications (title, message, type, user_id, role)
    VALUES (?, ?, ?, ?, ?)
  `;
  try {
    const [result] = await db.query(query, [title, message, type, user_id, role]);
    return result.insertId;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err; // Re-throw the error so calling functions can catch it
  }
};

/**
 * Fetch unread notification count for a user.
 *
 * @param {number} userId
 * @returns {Promise<number>}
 */
exports.getUnreadCountForUser = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0 AND role = 'user'`,
      [userId]
    );
    return rows[0]?.unread || 0;
  } catch (err) {
    console.error('Failed to fetch unread user notifications:', err);
    return 0;
  }
};

/**
 * Fetch unread notification count for admin.
 * Admin notifications typically have user_id as NULL and role as 'admin'.
 *
 * @returns {Promise<number>}
 */
exports.getUnreadCountForAdmin = async () => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE role = 'admin' AND user_id IS NULL AND is_read = 0`
    );
    return rows[0]?.unread || 0;
  } catch (err) {
    console.error('Failed to fetch unread admin notifications:', err);
    return 0;
  }
};

/**
 * Mark a notification as read.
 *
 * @param {number} notificationId
 * @returns {Promise<boolean>}
 */
exports.markNotificationAsRead = async (notificationId) => {
  try {
    const [result] = await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ?`,
      [notificationId]
    );
    // Return true if at least one row was affected (i.e., notification was found and updated)
    return result.affectedRows > 0;
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return false;
  }
};

/**
 * Delete a notification.
 *
 * @param {number} notificationId
 * @returns {Promise<boolean>}
 */
exports.deleteNotification = async (notificationId) => {
  try {
    const [result] = await db.query(
      `DELETE FROM notifications WHERE id = ?`,
      [notificationId]
    );
    // Return true if at least one row was affected (i.e., notification was found and deleted)
    return result.affectedRows > 0;
  } catch (err) {
    console.error('Failed to delete notification:', err);
    return false;
  }
};