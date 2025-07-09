const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./db');

module.exports = function(passport) {
  const {
    FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET,
    FACEBOOK_CALLBACK_URL
  } = process.env;

  console.log('FACEBOOK_APP_ID:', FACEBOOK_APP_ID ? 'Set' : 'Not Set');
  console.log('FACEBOOK_APP_SECRET:', FACEBOOK_APP_SECRET ? 'Set' : 'Not Set');
  console.log('FACEBOOK_CALLBACK_URL:', FACEBOOK_CALLBACK_URL ? 'Set' : 'Not Set')

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET || !FACEBOOK_CALLBACK_URL) {
    console.warn('FACEBOOK STRATEGY NOT INITIALIZED: Missing env variables');
    return;
  }

  passport.use(new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'emails']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || '';
        const name = profile.displayName || 'Unknown';

        // Find or create user
        const [[existingUser]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser) {
          return done(null, existingUser);
        } else {
          const username = name.replace(/\s+/g, '').toLowerCase();
          const [result] = await db.query(
            'INSERT INTO users (firstname, username, email) VALUES (?, ?, ?)',
            [name, username, email]
          );
          return done(null, {
            id: result.insertId,
            firstname: name,
            username,
            email
          });
        }
      } catch (err) {
        console.error('Facebook strategy error:', err);
        return done(err, null);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [[user]] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
