const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../controllers/auth');

const {
  ordersCtrlFunction,
  getUserOrdersByStatus,
  getOrdersByStatus, 
  getAllOrdersJson,
  renderOrdersPage,
  clearOrders
} = require('../controllers/ordersCtrlFile');


router.get('/', isLoggedIn, renderOrdersPage); 

router.post('/', isLoggedIn, ordersCtrlFunction);

router.get('/my-orders', isLoggedIn, getUserOrdersByStatus);

router.get('/my-orders/:status', isLoggedIn, getOrdersByStatus);

router.get('/api/orders', isLoggedIn, getAllOrdersJson);

router.post('/clear', isLoggedIn, clearOrders);

module.exports = router;
