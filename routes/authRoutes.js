const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
    isAuthenticated,
    isNotAuthenticated
} = require('../middleware/authMiddleware');

// Login routes
router.get('/login', isNotAuthenticated, authController.getLogin);
router.post('/login', isNotAuthenticated, authController.postLogin);

// Change password routes
router.get('/change-password', isAuthenticated, authController.getChangePassword);
router.post('/change-password', isAuthenticated, authController.postChangePassword);

// Logout route
router.get('/logout', authController.logout);

module.exports = router;