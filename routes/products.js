const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const productsCtrlFunction = require('../controllers/productsCtrlFile');

// === Multer Storage Setup ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage }); 

// === Routes ===
router.get('/', productsCtrlFunction.viewProducts);
router.get('/api', productsCtrlFunction.getAllProductsJson);
router.post('/add', upload.single('image'), productsCtrlFunction.addProduct);
router.get('/edit/:id', productsCtrlFunction.editProductPage);
router.post('/edit/:id', upload.single('image'), productsCtrlFunction.updateProduct); 
router.post('/delete/:id', productsCtrlFunction.deleteProduct);

module.exports = router;
