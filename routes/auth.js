const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotpassword', authController.forgotpassword);
router.get('/resetpassword/:token', authController.renderResetPasswordPage);
router.post('/resetpassword/:token', authController.handleResetPassword);

router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback );

router.post('/profile/update', authController.updateProfile);


module.exports = router;
