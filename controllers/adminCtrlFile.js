const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Ensure this imports from your unified config/db.js
const { getUnreadCountForAdmin } = require('../utils/notify'); // Import for admin notifications

// GET login page
exports.loginPage = (req, res) => {
    res.render('admin/login', {
        layout: 'auth',
        title: 'Admin Login',
        admin: req.session.admin
    });
};

// POST login
exports.postLogin = async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        return res.render('admin/login', {
            title: 'Admin Login',
            error: 'Please enter both username/email and password.'
        });
    }

    try {
        // Check only admin table
        const query = 'SELECT * FROM admins WHERE username = ? OR email = ?';
        const [results] = await db.query(query, [usernameOrEmail, usernameOrEmail]);

        if (results.length === 0) {
            return res.render('admin/login', {
                title: 'Admin Login',
                error: 'Invalid admin username or email.'
            });
        }

        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.render('admin/login', {
                title: 'Admin Login',
                error: 'Incorrect password.'
            });
        }

        req.session.admin = {
            id: admin.id,
            name: admin.name,
            username: admin.username,
            email: admin.email,
            unreadCount: await getUnreadCountForAdmin()
        };

        return res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        return res.render('admin/login', {
            title: 'Admin Login',
            error: 'Internal server error.'
        });
    }
};


// GET dashboard (Consolidated and updated)
exports.dashboard = async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekDate = weekStart.toISOString().slice(0, 10);
    const month = new Date().getMonth() + 1; // getMonth() is 0-indexed

    const ordersTodayQuery = `SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) = ?`;
    const ordersWeekQuery = `SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) >= ?`;
    const ordersMonthQuery = `SELECT COUNT(*) as total FROM orders WHERE MONTH(created_at) = ?`;
    const weeklyChartQuery = `
        SELECT DAYNAME(created_at) as day, COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY day ORDER BY created_at ASC
    `; // Added ORDER BY for consistent chart data

    try {
        // Fetch and update unread notifications for admin using the utility function
        if (req.session.admin) { // Ensure admin session exists before trying to update
            req.session.admin.unreadCount = await getUnreadCountForAdmin();
        }

        const [pendingOrdersResult] = await db.query('SELECT COUNT(*) AS pending FROM orders WHERE status = "pending"');
        const [fulfilledOrdersResult] = await db.query('SELECT COUNT(*) AS fulfilled FROM orders WHERE status = "fulfilled"');


        const [todayResult] = await db.query(ordersTodayQuery, [today]);
        const [weekResult] = await db.query(ordersWeekQuery, [weekDate]);
        const [monthResult] = await db.query(ordersMonthQuery, [month]);
        const [chartResult] = await db.query(weeklyChartQuery);

        // Fill in chart data for all 7 days
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const counts = days.map(day => {
            const dayData = chartResult.find(d => d.day === day);
            return dayData ? dayData.count : 0;
        });

        res.render('admin/dashboard', {
            layout: 'admin',
            showSidebar: true,
            admin: req.session.admin,
            pending: pendingOrdersResult[0].pending,
            fulfilled: fulfilledOrdersResult[0].fulfilled,
            ordersToday: todayResult[0].total,
            ordersWeek: weekResult[0].total,
            ordersMonth: monthResult[0].total,
            ordersChartData: JSON.stringify(counts)
        });
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        res.render('admin/dashboard', {
            layout: 'admin',
            showSidebar: true,
            error: 'Error loading stats',
            admin: req.session.admin,
            pending: 0, // Default values in case of error
            fulfilled: 0,
            ordersToday: 0,
            ordersWeek: 0,
            ordersMonth: 0,
            ordersChartData: JSON.stringify([])
        });
    }
};


// GET logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};


exports.viewProducts = async (req, res) => {
    const editId = parseInt(req.query.edit);

    try {
        const [products] = await db.query('SELECT * FROM products');

        res.render('admin/products', {
            layout: 'admin',
            showSidebar: true,
            admin: req.session.admin,
            products,
            editId
        });
    } catch (err) {
        console.error('Error loading products:', err);
        return res.render('admin/products', {
            layout: 'admin',
            showSidebar: true,
            error: 'Error loading products',
            admin: req.session.admin,
            products: [] // Provide empty array on error
        });
    }
};


exports.addProduct = async (req, res) => {
    const { name, price, description } = req.body;
    try {
        await db.query('INSERT INTO products SET ?', { name, price, description });
        res.redirect('/admin/products?success=Product+added');
    } catch (err) {
        console.error('Add product error:', err);
        return res.redirect('/admin/products?error=Add+failed');
    }
};


exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.redirect('/admin/products?success=Deleted');
    } catch (err) {
        console.error('Delete product error:', err);
        return res.redirect('/admin/products?error=Delete+failed');
    }
};


// Roles and Permissions
exports.manageRoles = async (req, res) => {
    try {
        const sortOrder = req.query.sort === 'desc' ? 'DESC' : 'ASC';
        const [staff] = await db.query('SELECT * FROM admins ORDER BY display_order ASC');

        const formattedStaff = staff.map(admin => ({
            ...admin,
            can_read: admin.can_read === 1,
            can_write: admin.can_write === 1,
            can_delete: admin.can_delete === 1
        }));

        res.render('admin/roles', {
            layout: 'admin',
            showSidebar: true,
            admin: req.session.admin,
            staff: formattedStaff,
            sortOrder
        });
    } catch (err) {
        console.error('Error managing roles:', err);
        res.render('admin/roles', {
            layout: 'admin',
            showSidebar: true,
            admin: req.session.admin,
            staff: [],
            error: 'Failed to load staff roles'
        });
    }
};


exports.addStaff = async (req, res) => {
    const { name, username, email, password } = req.body;

    const can_read = req.body.can_read ? 1 : 0;
    const can_write = req.body.can_write ? 1 : 0;
    const can_delete = req.body.can_delete ? 1 : 0;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertQuery = `
            INSERT INTO admins (name, username, email, password, can_read, can_write, can_delete)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertQuery, [
            name,
            username,
            email,
            hashedPassword,
            can_read,
            can_write,
            can_delete
        ]);

        res.redirect('/admin/roles?success=Staff+added+successfully');
    } catch (err) {
        console.error('Insert Error:', err);
        return res.redirect('/admin/roles?error=Failed+to+add+staff');
    }
};


// Delete staff
exports.deleteStaff = async (req, res) => {
    const { id } = req.params;

    // Prevent deleting current admin (optional)
    if (req.session.admin.id == id) {
        return res.send("You cannot delete yourself.");
    }

    try {
        await db.query('DELETE FROM admins WHERE id = ?', [id]);
        res.redirect('/admin/roles');
    } catch (err) {
        console.error('Delete staff error:', err);
        throw err; // Re-throw or handle appropriately
    }
};

exports.reorderStaff = async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      await db.query('UPDATE admins SET display_order = ? WHERE id = ?', [i, id]);
    }

    return res.json({ message: 'Staff order updated successfully' });
  } catch (error) {
    console.error('Error updating staff order:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.viewOrders = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM orders');

        res.render('admin/orders', {
            layout: 'admin',
            showSidebar: true,
            orders: results,
            admin: req.session.admin
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        return res.render('admin/orders', {
            error: 'Unable to load orders',
            layout: 'admin',
            showSidebar: true,
            orders: [], // Provide empty array on error
            admin: req.session.admin
        });
    }
};

exports.viewAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users');

        res.render('admin/users', {
            users,
            layout: 'admin',
            showSidebar: true,
            admin: req.session.admin
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('admin/users',
            {
                users: [],
                layout: 'admin',
                error: 'Failed to load users',
                showSidebar: true, // Ensure showSidebar is included even on error
                admin: req.session.admin
            });
    }
};

// GET: View all notifications
exports.viewNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query(
            `SELECT * FROM notifications WHERE role = 'admin' ORDER BY created_at DESC`
        );

        // Mark all currently viewed admin notifications as read
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
            layout: 'admin',
            showSidebar: true,
            notifications,
            admin: req.session.admin
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return res.render('admin/notifications', {
            layout: 'admin',
            showSidebar: true,
            error: 'Failed to load notifications',
            notifications: [],
            admin: req.session.admin
        });
    }
};


// POST: Mark as read
exports.markNotificationAsRead = async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

        // Update admin's unread count in session
        if (req.session.admin) {
            req.session.admin.unreadCount = await getUnreadCountForAdmin();
        }

        // Emit updated count to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_admin', {
                unreadCount: req.session.admin ? req.session.admin.unreadCount : 0
            });
        }

        res.redirect('/admin/notifications');
    } catch (err) {
        console.error('Mark notification as read error:', err);
        res.redirect('/admin/notifications?error=Failed+to+mark+as+read');
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND role = "admin"');

        // Update admin's unread count in session
        if (req.session.admin) {
            req.session.admin.unreadCount = await getUnreadCountForAdmin();
        }

        // Emit updated count to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_admin', {
                unreadCount: req.session.admin ? req.session.admin.unreadCount : 0
            });
        }

        res.redirect('/admin/notifications');
    } catch (err) {
        console.error('Mark all read error:', err);
        throw err;
    }
};


// POST: Delete notification
exports.deleteNotification = async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('DELETE FROM notifications WHERE id = ?', [id]);

        // Update admin's unread count in session
        if (req.session.admin) {
            req.session.admin.unreadCount = await getUnreadCountForAdmin();
        }

        // Emit updated count to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_admin', {
                unreadCount: req.session.admin ? req.session.admin.unreadCount : 0
            });
        }

        res.redirect('/admin/notifications');
    } catch (err) {
        console.error('Delete notification error:', err);
        res.redirect('/admin/notifications?error=Failed+to+delete');
    }
};

// Clear all orders
exports.clearAllAdminOrders = async (req, res) => {
  try {
    await db.query('DELETE FROM orders');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error clearing orders:', err);
    return res.json({ success: false });
  }
};

// Clear all notifications
exports.clearAllAdminNotifications = async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE role = "admin"');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    return res.json({ success: false });
  }
};


exports.adminProfile = (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  res.render('admin/profile', {
    title: 'Admin Profile',
    layout: 'admin',
    showSidebar: true,
    admin: req.session.admin,
  });
};


exports.editAdminProfilePage = (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }

  res.render('admin/editProfile', {
    title: 'Edit Admin Profile',
    layout: 'admin',
    showSidebar: true,
    admin: req.session.admin,
  });
};

exports.updateAdminProfile = async (req, res) => {
  const { name, username, email } = req.body;

  try {
    await db.query(
      'UPDATE admins SET name = ?, username = ?, email = ? WHERE id = ?',
      [name, username, email, req.session.admin.id]
    );

    // Update session with new values
    req.session.admin.name = name;
    req.session.admin.username = username;
    req.session.admin.email = email;

    res.redirect('/admin/profile?success=Profile+updated');
  } catch (err) {
    console.error('Update profile error:', err);
    res.redirect('/admin/profile?error=Update+failed');
  }
};

exports.adminSettingsPage = (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }

  res.render('admin/settings', {
    layout: 'admin',
    title: 'Admin Settings',
    showSidebar: true,
    admin: req.session.admin,
    success: req.query.success,
    error: req.query.error
  });
};


exports.updateAdminSettings = async (req, res) => {
  const { name, username, email } = req.body;

  try {
    await db.query(
      'UPDATE admins SET name = ?, username = ?, email = ? WHERE id = ?',
      [name, username, email, req.session.admin.id]
    );

    // Update session
    req.session.admin.name = name;
    req.session.admin.username = username;
    req.session.admin.email = email;

    res.redirect('/admin/settings?success=Profile+updated');
  } catch (err) {
    console.error('Settings update error:', err);
    res.redirect('/admin/settings?error=Update+failed');
  }
};


exports.changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.redirect('/admin/settings?error=Passwords+do+not+match');
  }

  try {
    const [[admin]] = await db.query('SELECT * FROM admins WHERE id = ?', [req.session.admin.id]);

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) {
      return res.redirect('/admin/settings?error=Current+password+is+incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.session.admin.id]);

    res.redirect('/admin/settings?success=Password+changed+successfully');
  } catch (err) {
    console.error('Password change error:', err);
    res.redirect('/admin/settings?error=Failed+to+change+password');
  }
};
