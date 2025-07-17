const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
const db = require('../config/db');
const { sendUserReceipt } = require('../utils/email');
const { createNotification, getUnreadCountForUser, getUnreadCountForAdmin } = require('../utils/notify');

// === Render Checkout Page ===
exports.renderCheckoutPage = (req, res) => {
  const user = req.session.userData;
  if (!user) return res.redirect('/auth/login');

  const cart = req.session.cart || {};
  const cartItems = Object.values(cart);

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.inCart), 0);

  res.render('users/checkout', {
    user,
    amount: totalAmount,
    FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY
  });
};

// === Handle Checkout POST (Flutterwave Payment Init) ===
exports.checkoutCtrlFunction = async (req, res) => {
  try {
    const { products, user } = req.body;

    if (!user || !user.email || !user.id) {
      return res.status(400).json({ error: 'User info missing from request' });
    }

    let totalAmount = 0;
    const enrichedCart = [];

    for (const item of products) {
      const [rows] = await db.query('SELECT name, price FROM products WHERE id = ?', [item.id]);
      if (rows.length) {
        totalAmount += rows[0].price * item.inCart;
        enrichedCart.push({
          id: item.id,
          inCart: item.inCart,
          name: rows[0].name,
          price: rows[0].price
        });
      }
    }

    const shippingFee = 10;
    totalAmount += shippingFee;

    const tx_ref = `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [dbUserResult] = await db.query('SELECT firstname, lastname, username, email, phone FROM users WHERE id = ?', [user.id]);
    const dbUser = dbUserResult[0] || {};

    req.session.userData = {
      id: user.id,
      firstname: dbUser.firstname || user.firstname || '',
      lastname: dbUser.lastname || user.lastname || '',
      username: dbUser.username || user.username || '',
      email: dbUser.email || user.email || '',
      phone: dbUser.phone || user.phone || '',
    };

    req.session.cart = enrichedCart;

    const redirectUrl = `${process.env.BASE_URL}/checkout/success`;

    return res.status(200).json({
      tx_ref,
      amount: totalAmount,
      currency: 'BGN',
      redirect_url: redirectUrl,
      customer: {
        email: req.session.userData.email,
        name: `${req.session.userData.firstname} ${req.session.userData.lastname}`.trim()
      }
    });

  } catch (error) {
    console.error("Payment Init Error:", error);
    return res.status(500).json({ error: 'Payment initialization failed.' });
  }
};

// === Handle Successful Payment Redirect ===
exports.cartSuccessFunction = async (req, res) => {
  const { tx_ref, transaction_id } = req.query;

  if (!tx_ref || !transaction_id) {
    console.warn('Missing tx_ref or transaction_id in query');
    return res.status(400).send('Missing transaction reference or ID.');
  }

  try {
    const result = await flw.Transaction.verify({ id: transaction_id });

    // If the payment failed
    if (!result || result.data.status !== 'successful') {
      console.warn('Transaction not successful:', result?.data?.status);
      return res.redirect('/cart?paid=false');
    }

    // Rebuild user info in case session was lost
    let userId = req.session?.userData?.id;

    // If session is lost, recover from DB using email
    if (!userId && result.data.customer?.email) {
      const [userMatch] = await db.query('SELECT * FROM users WHERE email = ?', [result.data.customer.email]);
      if (userMatch.length) {
        req.session.userData = userMatch[0];
        userId = userMatch[0].id;
      }
    }

    // Handle final fallback if user not found
    const fallbackUser = {
      id: null,
      name: result.data.customer?.name || 'Customer',
      email: result.data.customer?.email || 'unknown@user.com',
      phone: result.data.customer?.phone || 'N/A'
    };

    const userData = req.session.userData || fallbackUser;

    // Prevent repeated processing
    if (req.session.lastProcessedTxRef === tx_ref) {
      return res.render('users/thankyouPage', {
        tx_ref,
        amount: req.session.lastProcessedAmount,
        customer_name: req.session.lastProcessedName,
        customer_email: req.session.lastProcessedEmail,
        customer_phone: req.session.lastProcessedPhone,
        user: req.session.userData
      });
    }

    const amount = result.data.amount;
    const transactionExists = await db.query(
      'SELECT id FROM transactions WHERE transaction_id = ?', [transaction_id]
    );

    if (!transactionExists[0].length) {
      await db.query(
        `INSERT INTO transactions (tx_ref, transaction_id, customer_name, customer_phone, customer_email, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tx_ref, transaction_id, userData.name, userData.phone, userData.email, amount, 'successful']
      );
    }

    const cartItems = req.session.cart || [];
    const productSummary = cartItems.map(item => `${item.inCart} ${item.name}`).join(', ') || 'No items';

    // Insert order if not already in db
    await db.query(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_email, products, transaction_id, transaction_ref, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userData.id, userData.name, userData.phone, userData.email, productSummary, transaction_id, tx_ref, amount, 'confirmed']
    );

    req.session.cart = [];

    // Notifications
    const userNotifId = await createNotification(
      'Order Confirmed',
      `Hi ${userData.name.split(' ')[0]}, your order has been received and is being processed.`,
      'order',
      userData.id,
      'user'
    );

    const adminNotifId = await createNotification(
      'New Order Received',
      `${userData.name} placed an order for ${productSummary}.`,
      'order',
      null,
      'admin'
    );

    // Update unread counts
    const unreadUser = userData.id ? await getUnreadCountForUser(userData.id) : 0;
    const unreadAdmin = await getUnreadCountForAdmin();

    const io = req.app.get('io');
    if (io) {
      if (userData.id) {
        io.emit(`notification_user_${userData.id}`, {
          title: 'Order Confirmed',
          message: `Hi ${userData.name.split(' ')[0]}, your order has been received.`,
          id: userNotifId,
          unreadCount: unreadUser
        });
      }

      io.emit('notification_admin', {
        title: 'New Order Received',
        message: `${userData.name} placed an order.`,
        id: adminNotifId,
        unreadCount: unreadAdmin
      });
    }

    // Save for re-render
    req.session.lastProcessedTxRef = tx_ref;
    req.session.lastProcessedAmount = amount;
    req.session.lastProcessedName = userData.name;
    req.session.lastProcessedEmail = userData.email;
    req.session.lastProcessedPhone = userData.phone;

    return res.render('users/thankyouPage', {
      tx_ref,
      amount,
      customer_name: userData.name,
      customer_email: userData.email,
      customer_phone: userData.phone,
      user: req.session.userData || null
    });

  } catch (err) {
    console.error('Transaction verification failed:', err.message || err);
    return res.redirect('/cart?paid=false');
  }
};
