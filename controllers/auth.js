const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const db = require('../config/db'); 
const { getUnreadCountForUser } = require('../utils/notify'); 
const { sendResetEmail } = require('../utils/email');
const passport = require('passport');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('users/login', {
        message: 'Please enter an email and password'
      });
    }

    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!results || results.length === 0) {
      return res.status(401).render('users/login', {
        message: 'Email or Password is incorrect'
      });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).render('users/login', {
        message: 'Email or Password is incorrect'
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.cookie('jwt', token, {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Store user info in session and fetch unread count
    const userUnreadCount = await getUnreadCountForUser(user.id);
    req.session.userData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      unreadCount: userUnreadCount // Store unread count
    };
    res.locals.user = req.session.userData; // Make available to res.locals immediately

    return res.redirect('/profile');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('users/login', {
      message: 'An error occurred. Please try again later.'
    });
  }
};


exports.signup = async (req, res) => {
  const { firstname, lastname, username, email, password, passwordConfirm, phone } = req.body;

  try {
    const [results] = await db.query('SELECT email FROM users WHERE email = ?', [email]);

    if (results.length > 0) {
      return res.render('users/signup', { message: 'The email is already in use' });
    } else if (password !== passwordConfirm) {
      return res.render('users/signup', { message: 'Passwords do not match' });
    }

    let hashedPassword = await bcrypt.hash(password, 8);

    const [insertResult] = await db.query('INSERT INTO users SET ?', {
      firstname,
      lastname,
      username,
      email,
      password: hashedPassword,
      phone
    });

    const userId = insertResult.insertId;
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.cookie('jwt', token, {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Store user info in session after signup, including initial unread count (0)
    req.session.userData = {
      id: userId,
      firstname,
      lastname,
      username,
      email,
      phone,
      unreadCount: 0 // New user, so 0 unread notifications
    };
    res.locals.user = req.session.userData; // Make available to res.locals immediately

    return res.redirect('/login?success=account_created');

  } catch (err) {
    console.error('Signup error:', err);
    return res.render('users/signup', { message: 'An error occurred during registration. Try again.' });
  }
};

exports.isLoggedIn = async (req, res, next) => {
  // This middleware is for user authentication for routes that require it.
  // The global middleware in server.js already updates res.locals.user and unread counts.
  // This function primarily focuses on setting req.session.userData if it's missing or from JWT.

  if (req.session.userData && req.session.userData.id) {
    // If session data exists, ensure unread count is up-to-date (handled by global middleware now)
    // res.locals.user is already set by the global middleware
    return next();
  }

  const token = req.cookies.jwt;

  if (token && token !== 'logout') {
    try {
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

      const [result] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

      if (!result || result.length === 0) {
        res.cookie('jwt', 'logout', { expires: new Date(Date.now() + 1000), httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        req.session.userData = null;
        return next();
      }

      // Fetch unread count for user from JWT
      const userUnreadCount = await getUnreadCountForUser(result[0].id);
      req.session.userData = {
        id: result[0].id,
        firstname: result[0].firstname,
        lastname: result[0].lastname,
        username: result[0].username,
        email: result[0].email,
        phone: result[0].phone,
        unreadCount: userUnreadCount // Store unread count
      };

      res.locals.user = req.session.userData; // Ensure res.locals.user is set
      return next();
    } catch (error) {
      console.error('JWT verification or DB lookup error in isLoggedIn:', error.message);
      res.cookie('jwt', 'logout', { expires: new Date(Date.now() + 1000), httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      req.session.userData = null;
      return next();
    }
  } else {
    // No JWT or it's 'logout', proceed to next middleware/route
    return next();
  }
};


exports.logout = async (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  req.session.destroy((err) => { // Destroy the session on logout
    if (err) {
      console.error('Error destroying user session on logout:', err);
      // Optionally redirect to home even on error
      return res.redirect('/');
    }
    res.clearCookie('session_cookie_name'); // Clear the session cookie name if it's set
    res.redirect('/');
  });
};

exports.forgotpassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [[user]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    const token = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.query(
      `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
      [token, expires, user.id]
    );

    const resetLink = `http://localhost:3000/auth/resetpassword/${token}`;
    await sendResetEmail(user.email, resetLink);

    res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


exports.renderResetPasswordPage = async (req, res) => {
  const { token } = req.params;

  const [[user]] = await db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
    [token]
  );

  if (!user) return res.send('Invalid or expired token.');

  res.render('users/resetpassword', {
    layout: 'main',
    token,
  });
};

exports.handleResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const [[user]] = await db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
    [token]
  );

  if (!user) return res.send('Invalid or expired token.');

  const hashed = await bcrypt.hash(password, 10);
  await db.query(
    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
    [hashed, user.id]
  );

 res.send(`
  <html>
    <head>
      <title>Password Reset</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa;
          padding-top: 100px;
        }
        .card {
          max-width: 500px;
          margin: 0 auto;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .card-body {
          text-align: center;
        }
        .btn-login {
          background-color: #28a745;
          color: #fff;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-body">
          <h3 class="mb-3"> Password Reset Successful</h3>
          <p>Your password has been updated successfully.</p>
          <a href="/login" class="btn btn-login mt-3">Login Now</a>
        </div>
      </div>
    </body>
  </html>
`);
};

exports.facebookAuth = passport.authenticate('facebook', { scope: ['email'] });

exports.facebookCallback = async (req, res, next) => {
  passport.authenticate('facebook', async (err, user, info) => {
    if (err || !user) {
      console.error('Facebook auth error:', err || info);
      return res.redirect('/login');
    }

    try {
      req.login(user, (err) => {
        if (err) {
          console.error('Login error after Facebook callback:', err);
          return res.redirect('/login');
        }

        req.session.userData = {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          unreadCount: 0
        };

        return res.redirect('/profile');
      });
    } catch (e) {
      console.error('Session error after Facebook callback:', e);
      return res.redirect('/login');
    }
  })(req, res, next);
};

exports.updateProfile = async (req, res) => {
  const {
    first_name,
    last_name,
    username,
    phone,
    address,
    city,
    state,
    zip_code,
    country
  } = req.body;

  const userId = req.session.userData?.id;
  if (!userId) return res.redirect('/auth/login');

  try {
    // Update the database
    await db.query(
      `UPDATE users
       SET firstname = ?, lastname = ?, username = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ?
       WHERE id = ?`,
      [first_name, last_name, username, phone, address, city, state, zip_code, country, userId]
    );

    // Refresh session userData
    const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    req.session.userData = updatedUser[0];
    res.locals.user = updatedUser[0];

    return res.redirect('/profile?success=Updated');
  } catch (err) {
    console.error('Profile update error:', err);
    return res.redirect('/profile?error=Update+failed');
  }
};


