const express = require('express');
const { shopCtrlFunction, privacyCtrlFunction, returnCtrlFunction, deliveryCtrlFunction, aboutCtrlFunction, contactCtrlFunction, tosCtrlFunction, signupCtrlFunction} = require('../controllers/pagesCtrlFile');
const authController = require('../controllers/auth');
const router = express.Router();

router.get('/', authController.isLoggedIn, (req, res) => {
        res.render('users/index', {
            layout:'main',
            showSidebar: false,
            user: req.user
        });
});


router.get('/shop', shopCtrlFunction);
router.get('/privacypolicy', privacyCtrlFunction);
router.get('/returnpolicy', returnCtrlFunction);
router.get('/deliverypolicy', deliveryCtrlFunction);
router.get('/about', aboutCtrlFunction);
router.get('/contact', contactCtrlFunction);
router.get('/termsofservice', tosCtrlFunction);
router.get('/signup', signupCtrlFunction);

router.get('/login', (req, res) => {
  const successMessage = req.query.success === 'account_created'
    ? 'User account created successfully! Please log in.'
    : null;

  res.render('users/login', {
    layout: 'main',
    message: null,           // For login error messages
    successMessage           // For signup success
  });
});


router.get('/profile', authController.isLoggedIn, (req, res) => {
    console.log(req.user);
    if (req.user) {
        res.render('users/profile', {
            layout: 'main',
            user: req.user,
        });
    } else {
        res.redirect('/login');
    }
});

router.get('/cart', authController.isLoggedIn, (req, res) => {
        console.log(req.user);
    if (req.user) {
        res.render('users/cart', {
            cart: req.session.cart,
            layout: 'main',
            user: req.user,
            FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY
        });
    } else {
        res.redirect('/login');
    }
});

router.get('/wishlist', authController.isLoggedIn, (req, res) => {
        console.log(req.user);
    if (req.user) {
        res.render('users/wishlist', {
            cart: req.session.cart,
            layout: 'main',
            user: req.user,
        });
    } else {
        res.redirect('/login');
    }
});


module.exports = router;