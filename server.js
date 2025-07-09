const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const http = require('http');
const socketIO = require('socket.io');
const passport = require('passport');

dotenv.config({ path: './.env' });

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// DB connection
const db = require('./config/db');
const sessionStore = new MySQLStore({}, db);

// Passport config (call as a function)
require('./config/passport')(passport);

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, './public')));

// Express session
app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'novelecomapp',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Attach db to request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// User injection
app.use((req, res, next) => {
  if (req.session.userData) {
    req.user = req.session.userData;
  }
  next();
});

// Cart and user info
app.use((req, res, next) => {
  const cart = req.session.cart || {};
  let count = 0;
  for (const key in cart) {
    count += cart[key].inCart || 0;
  }
  res.locals.cartCount = count;
  res.locals.user = req.session.userData || null;
  res.locals.admin = req.session.admin || null;
  next();
});

// Notification count middleware
app.use(async (req, res, next) => {
  try {
    if (req.session.userData?.id) {
      const [notifCount] = await db.query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0 AND role = 'user'`,
        [req.session.userData.id]
      );
      res.locals.unreadNotifications = notifCount[0]?.unread || 0;
    }

    const [adminNotifCount] = await db.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE role = 'admin' AND is_read = 0`
    );
    res.locals.unreadAdminNotifications = adminNotifCount[0]?.unread || 0;

    next();
  } catch (err) {
    console.error('Notification middleware error:', err);
    next();
  }
});

// View engine setup
const exphbs = require('express-handlebars');
app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: 'main',
  helpers: {
    eq: (a, b) => a === b,
    ifEquals: (a, b, options) => (a == b ? options.fn(this) : options.inverse(this))
  },
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const adminRoutes = require('./routes/admin');
const checkoutRoutes = require('./routes/checkout');
const authRoutes = require('./routes/auth');
const pagesRoutes = require('./routes/pages');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const userNotifRoutes = require('./routes/usernotify');
const adminNotifRoutes = require('./routes/adminnotify');

app.use('/', pagesRoutes);
app.use('/products', productsRoutes);
app.use('/auth', authRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/admin', adminRoutes);
app.use('/orders', ordersRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/notifications', userNotifRoutes);
app.use('/adminnotify', adminNotifRoutes);
app.use('/api/user/notifications', userNotifRoutes);
app.use('/api/user/orders', ordersRoutes);

// DB Test
(async () => {
  try {
    const [rows] = await db.query('SELECT * FROM users LIMIT 1');
    console.log('Database connected! Sample user:', rows[0]);
  } catch (err) {
    console.error('DB Error:', err);
  }
})();

// Socket.io setup
app.set('io', io);
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
