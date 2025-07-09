// middlewares/authMiddleware.js
function authMiddleware(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  } else {
    return res.redirect('/admin/login');
  }
}

module.exports = authMiddleware;
