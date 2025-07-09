const express = require('express');

const router = express.Router();
const productsCtrlFunction = require('../controllers/productsCtrlFile');

router.get('/', productsCtrlFunction.viewProducts);
router.get('/api', productsCtrlFunction.getAllProductsJson);
router.post('/add', productsCtrlFunction.addProduct);
router.post('/delete/:id', productsCtrlFunction.deleteProduct);

module.exports = router;


