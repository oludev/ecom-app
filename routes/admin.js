const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

// Controllers
const adminCtrlFunction = require('../controllers/adminCtrlFile');
const productsCtrlFunction = require('../controllers/productsCtrlFile');
const authMiddleware = require('../middlewares/authMiddleware');

// === Multer Storage Setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// === Admin Auth Routes ===
router.get('/login', adminCtrlFunction.loginPage);
router.post('/login', adminCtrlFunction.postLogin);
router.get('/logout', adminCtrlFunction.logout);

// === Dashboard ===
router.get('/dashboard', authMiddleware, adminCtrlFunction.dashboard);

// === Roles / Staff Management ===
router.get('/roles', authMiddleware, adminCtrlFunction.manageRoles);
router.post('/roles/add', authMiddleware, adminCtrlFunction.addStaff);
router.post('/roles/delete/:id', authMiddleware, adminCtrlFunction.deleteStaff);
router.post('/roles/reorder', authMiddleware, adminCtrlFunction.reorderStaff);

// === Product Management ===
router.get('/products', authMiddleware, productsCtrlFunction.viewProducts);
router.get('/products/api', authMiddleware, productsCtrlFunction.getAllProductsJson);
router.post('/products/add', authMiddleware, upload.single('image'), productsCtrlFunction.addProduct);
router.get('/products/edit/:id', authMiddleware, productsCtrlFunction.editProductPage);
router.post('/products/edit/:id', authMiddleware, upload.single('image'), productsCtrlFunction.updateProduct);
router.post('/products/delete/:id', authMiddleware, productsCtrlFunction.deleteProduct);

// === Users & Orders ===
router.get('/users', authMiddleware, adminCtrlFunction.viewAllUsers);
router.get('/orders', authMiddleware, adminCtrlFunction.viewOrders);
router.post('/api/orders/clear', authMiddleware, adminCtrlFunction.clearAllAdminOrders);

// === Notifications ===
router.get('/notifications', authMiddleware, adminCtrlFunction.viewNotifications);
router.post('/notifications/:id/read', authMiddleware, adminCtrlFunction.markNotificationAsRead);
router.post('/notifications/:id/delete', authMiddleware, adminCtrlFunction.deleteNotification);
router.post('/notifications/mark-all-read', authMiddleware, adminCtrlFunction.markAllRead);
router.post('/api/notifications/clear', authMiddleware, adminCtrlFunction.clearAllAdminNotifications);

// === Admin Profile ===
router.get('/profile', authMiddleware, adminCtrlFunction.adminProfile);
router.get('/profile/edit', authMiddleware, adminCtrlFunction.editAdminProfilePage);
router.post('/profile/update', authMiddleware, upload.single('image'), adminCtrlFunction.updateAdminProfile);

// === Settings ===
router.get('/settings', authMiddleware, adminCtrlFunction.adminSettingsPage);
router.post('/settings/update', authMiddleware, adminCtrlFunction.updateAdminSettings);
router.post('/settings/password', authMiddleware, adminCtrlFunction.changeAdminPassword);

module.exports = router;
