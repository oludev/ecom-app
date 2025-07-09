// // middleware/sessionUser.js
// module.exports = (req, res, next) => {
//   if (!req.session.user && req.session.userData) {
//     req.session.user = req.session.userData;
//   }
//   next();
// };
