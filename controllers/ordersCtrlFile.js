const db = require('../config/db');
// Import notification utilities
const { createNotification, getUnreadCountForUser, getUnreadCountForAdmin } = require('../utils/notify');

// Renders /orders page with all user orders
exports.renderOrdersPage = async (req, res) => {
  const user = req.session.userData;
  if (!user) return res.redirect('/auth/login');

  try {
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    res.render('users/orders', {
      layout: 'main',
      user: req.session.userData,
      orders
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).render('users/orders', {
      user,
      orders: [],
      message: 'Unable to load orders'
    });
  }
};


// Create order (POST /orders)
exports.ordersCtrlFunction = async (req, res) => {
  const user_id = req.session.userData?.id;

  const {
    customer_name,
    customer_email,
    transaction_id,
    transaction_ref,
    amount,
    status = 'pending'
  } = req.body;

  if (!user_id) {
    return res.status(401).json({ success: false, message: "User not logged in" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO orders (user_id, customer_name, customer_email, transaction_id, transaction_ref, amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, customer_name, customer_email, transaction_id, transaction_ref, amount, status]
    );
    res.status(201).json({ success: true, orderId: result.insertId });
  } catch (err) {
    console.error('Order Insert Error:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// Filtered order list for logged-in user
exports.getOrdersByStatus = async (req, res) => {
  const status = req.params.status;
  const userId = req.session.userData?.id;

  if (!userId) return res.redirect('/auth/login');

  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  const params = [userId];

  if (status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }

  try {
    const [orders] = await db.execute(sql, params);

    res.render('users/orders', {
      user: req.session.userData,
      orders,
      filterStatus: status,
      status
    });
  } catch (err) {
    console.error('Order fetch error:', err);
    res.status(500).render('users/orders', {
      user: req.session.userData,
      orders: [],
      message: 'Failed to fetch filtered orders'
    });
  }
};

// (Optional) Legacy: get orders by status using callbacks
exports.getUserOrdersByStatus = (req, res) => {
  const userId = req.session.userData?.id;
  const status = req.params.status;

  if (!userId) return res.redirect('/auth/login');

  const query = `
    SELECT * FROM orders
    WHERE user_id = ? AND status = ?
    ORDER BY created_at DESC
  `;

  db.query(query, [userId, status])
    .then(([results]) => {
      res.render('users/orders', {
        user: req.session.userData,
        orders: results,
        status
      });
    })
    .catch((err) => {
      console.error(err);
      res.render('users/orders', {
        user: req.session.userData,
        orders: [],
        message: 'Error loading orders'
      });
    });
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  const { transaction_id, newStatus } = req.body;

  try {
    // First, update the status
    await db.execute(
      `UPDATE orders SET status = ? WHERE transaction_id = ?`,
      [newStatus, transaction_id]
    );

    // Fetch the updated order details to get user_id and product summary
    const [orderRows] = await db.execute(
      `SELECT user_id, customer_name, products FROM orders WHERE transaction_id = ?`,
      [transaction_id]
    );

    const order = orderRows[0];
    if (order && order.user_id) {
      const userId = order.user_id;
      const customerName = order.customer_name || 'Customer'; // Fallback
      const productSummary = order.products || 'some items'; // Fallback

      // Create user notification for status change
      await createNotification(
        'Order Status Updated',
        `Hi ${customerName}, your order for ${productSummary} is now ${newStatus}.`,
        'order_update',
        userId,
        'user'
      );

      // Create admin notification for status change
      await createNotification(
        'Order Status Change',
        `Order ID ${transaction_id} status changed to ${newStatus} by Admin.`,
        'order_update',
        null, // Admin notification
        'admin'
      );

      // Get updated unread counts
      const updatedUserUnreadCount = await getUnreadCountForUser(userId);
      const updatedAdminUnreadCount = await getUnreadCountForAdmin();

      // Emit socket events
      const io = req.app.get('io'); // Get the Socket.IO instance
      if (io) {
        // Emit to specific user
        io.emit(`notification_user_${userId}`, {
          title: 'Order Status Updated',
          message: `Your order is now ${newStatus}.`,
          unreadCount: updatedUserUnreadCount
        });

        // Emit to all admins
        io.emit('notification_admin', {
          title: 'Order Status Change',
          message: `Order ID ${transaction_id} status updated to ${newStatus}.`,
          unreadCount: updatedAdminUnreadCount
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Order Update Error:', err);
    res.status(500).json({ success: false });
  }
};

// JSON API for AJAX filtering
exports.getAllOrdersJson = async (req, res) => {
  const status = req.query.status;
  const userId = req.session.userData?.id;

  if (!userId) {
    return res.json({ success: false, message: "User not logged in" });
  }

  try {
    let query = "SELECT * FROM orders WHERE user_id = ?";
    const params = [userId];

    if (status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    const [orders] = await db.query(query, params);

    res.json({ success: true, orders });
  } catch (err) {
    console.error("API Orders Fetch Error:", err);
    res.json({ success: false, message: "Error fetching orders" });
  }
};

exports.clearOrders = async (req, res) => {
  try {
    const userId = req.session.userData.id;

    await req.db.query('DELETE FROM orders WHERE user_id = ?', [userId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Clear orders error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
