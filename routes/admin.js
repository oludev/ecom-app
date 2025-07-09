const express = require('express');
const router = express.Router();
const adminCtrlFunction = require('../controllers/adminCtrlFile');
const authMiddleware = require('../middlewares/authMiddleware');
const productsCtrlFunction = require('../controllers/productsCtrlFile');
const multer = require('multer');
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });



router.get('/login', adminCtrlFunction.loginPage);
router.post('/login', adminCtrlFunction.postLogin); 
router.get('/dashboard', authMiddleware, adminCtrlFunction.dashboard);
router.get('/logout', adminCtrlFunction.logout)

router.get('/roles', authMiddleware, adminCtrlFunction.manageRoles);
router.post('/roles/add', authMiddleware, adminCtrlFunction.addStaff);
router.post('/roles/delete/:id', authMiddleware, adminCtrlFunction.deleteStaff);
router.post('/roles/reorder', authMiddleware, adminCtrlFunction.reorderStaff);


router.get('/products', authMiddleware, productsCtrlFunction.viewProducts);
// router.post('/products/add', productsCtrlFunction.addProduct);
router.get('/products/api', authMiddleware, productsCtrlFunction.getAllProductsJson);
router.post('/products/add', upload.single('image'), productsCtrlFunction.addProduct);
router.get('/products/edit/:id', authMiddleware, productsCtrlFunction.editProductPage);
router.post('/products/edit/:id', authMiddleware, productsCtrlFunction.updateProduct);
router.post('/products/delete/:id', productsCtrlFunction.deleteProduct);

router.get('/users', authMiddleware, adminCtrlFunction.viewAllUsers);

router.get('/orders', authMiddleware, adminCtrlFunction.viewOrders);

router.get('/notifications', authMiddleware, adminCtrlFunction.viewNotifications);
router.post('/notifications/:id/read', authMiddleware, adminCtrlFunction.markNotificationAsRead);
router.post('/notifications/:id/delete', authMiddleware, adminCtrlFunction.deleteNotification);
router.post('/notifications/mark-all-read', authMiddleware, adminCtrlFunction.markAllRead);

router.post('/api/orders/clear', authMiddleware, adminCtrlFunction.clearAllAdminOrders);
router.post('/api/notifications/clear', authMiddleware, adminCtrlFunction.clearAllAdminNotifications);

router.get('/profile', authMiddleware, adminCtrlFunction.adminProfile)
router.get('/profile/edit', authMiddleware, adminCtrlFunction.editAdminProfilePage);
router.post('/profile/update', authMiddleware, adminCtrlFunction.updateAdminProfile);

router.get('/settings', adminCtrlFunction.adminSettingsPage);
router.post('/settings/update', adminCtrlFunction.updateAdminSettings);
router.post('/settings/password', adminCtrlFunction.changeAdminPassword);


module.exports = router;
