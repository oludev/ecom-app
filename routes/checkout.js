const express = require('express');
const router = express.Router();
const {
  checkoutCtrlFunction,
  cartSuccessFunction,
  renderCheckoutPage
} = require('../controllers/checkoutCtrlFile');
const { isLoggedIn } = require('../controllers/auth'); // import isLoggedIn middleware

// Show the checkout form at GET /checkout
router.get('/', isLoggedIn, renderCheckoutPage);

// When the front‐end POSTs to /checkout, initiate payment
router.post('/', isLoggedIn, checkoutCtrlFunction);

// Flutterwave will redirect back here on success (e.g. /checkout/success?tx_ref=…&transaction_id=…)
router.get('/success', cartSuccessFunction);


module.exports = router

