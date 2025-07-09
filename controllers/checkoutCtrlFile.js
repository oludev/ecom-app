const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
const db = require('../config/db'); 
const { sendUserReceipt } = require('../utils/email');
const { createNotification, getUnreadCountForUser, getUnreadCountForAdmin } = require('../utils/notify');

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

exports.checkoutCtrlFunction = async (req, res) => {
  try {
    const productsFromFrontend = req.body.products || [];
    const { products, user } = req.body;

    if (!user || !user.email || !user.id) {
      return res.status(400).json({ error: 'User info missing from request' });
    }

    let totalAmount = 0;
    for (const item of productsFromFrontend) {
      const [rows] = await db.query('SELECT name, price FROM products WHERE id = ?', [item.id]);
      if (rows.length) {
        totalAmount += rows[0].price * item.inCart;
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

    const enrichedCart = [];
    for (const item of products) {
      const [rows] = await db.query('SELECT name, price FROM products WHERE id = ?', [item.id]);
      if (rows.length) {
        enrichedCart.push({
          id: item.id,
          inCart: item.inCart,
          name: rows[0].name,
          price: rows[0].price
        });
      }
    }
    req.session.cart = enrichedCart;

    const redirectHost = req.protocol + '://' + req.get('host');
    const redirectUrl = `${redirectHost}/checkout/success`;

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

exports.cartSuccessFunction = async (req, res) => {
  const { tx_ref, transaction_id } = req.query;

  if (!tx_ref || !transaction_id) {
    return res.status(400).send('Missing transaction reference or ID.');
  }

  try {
    // Prevent repeated processing on page reload
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

    const result = await flw.Transaction.verify({ id: transaction_id });

    if (!result || result.data.status !== 'successful') {
      return res.redirect('/cart?paid=false');
    }

    const io = req.app.get('io');

    let userSession = req.session.userData || {};
    let userId = userSession.id;

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const dbUser = rows[0] || {};

    const customerName = dbUser.firstname && dbUser.lastname ? `${dbUser.firstname} ${dbUser.lastname}` : dbUser.username || userSession.username || 'Guest';
    const customerEmail = dbUser.email || userSession.email || 'not@provided.com';
    const customerPhone = dbUser.phone || userSession.phone || 'N/A';
    const customerFirstName = dbUser.firstname || customerName.split(' ')[0];

    const amount = result.data.amount;

    const [existingTx] = await db.query(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [transaction_id]
    );
    if (existingTx.length === 0) {
      await db.query(
        'INSERT INTO transactions (tx_ref, transaction_id, customer_name, customer_phone, customer_email, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tx_ref, transaction_id, customerName, customerPhone, customerEmail, amount, 'successful']
      );
    }

    const cartItems = req.session.cart || [];
    const productSummary = cartItems.map(item => `${item.inCart} ${item.name}`).join(', ') || 'No items';

    await db.query(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_email, products, transaction_id, transaction_ref, amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerName, customerPhone, customerEmail, productSummary, transaction_id, tx_ref, amount, 'confirmed']
    );

    req.session.cart = [];

    const userNotifId = await createNotification(
      'Order Confirmed',
      `Hi ${customerFirstName}, your order has been received and is being processed.`,
      'order',
      userId,
      'user'
    );

    const adminNotifId = await createNotification(
      'New Order Received',
      `${customerFirstName} placed an order for ${productSummary}.`,
      'order',
      null,
      'admin'
    );

    let updatedUserUnreadCount = 0;
    if (userId) {
      updatedUserUnreadCount = await getUnreadCountForUser(userId);
      req.session.userData.unreadCount = updatedUserUnreadCount;
    }

    const updatedAdminUnreadCount = await getUnreadCountForAdmin();
    if (req.session.admin) {
      req.session.admin.unreadCount = updatedAdminUnreadCount;
    }

    await sendUserReceipt({
      toEmail: customerEmail,
      logoUrl: '../images/ff-logo.png',
      name: customerFirstName,
      orderItems: cartItems.map(item => ({
        name: item.name,
        quantity: item.inCart,
        price: item.price
      })),
      amount,
      tx_ref
    });

    if (io) {
      io.emit(`notification_user_${userId}`, {
        title: 'Order Confirmed',
        message: `Hi ${customerFirstName}, your order has been received.`,
        id: userNotifId,
        unreadCount: updatedUserUnreadCount
      });

      io.emit('notification_admin', {
        title: 'New Order Received',
        message: `${customerFirstName} placed an order for ${productSummary}.`,
        id: adminNotifId,
        unreadCount: updatedAdminUnreadCount
      });
    }

    // Save values to session to avoid reprocessing
    req.session.lastProcessedTxRef = tx_ref;
    req.session.lastProcessedAmount = amount;
    req.session.lastProcessedName = customerName;
    req.session.lastProcessedEmail = customerEmail;
    req.session.lastProcessedPhone = customerPhone;

    return res.render('users/thankyouPage', {
      tx_ref,
      amount,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      user: req.session.userData
    });

  } catch (err) {
    console.error('Verification Error:', err.message || err);
    return res.redirect('/cart?paid=false');
  }
};
