const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const {
    isAuthenticated
} = require('../middleware/authMiddleware');

// Dashboard home route
router.get('/', isAuthenticated, dashboardController.getDashboard);

// Device control routes
router.get('/device-control', isAuthenticated, dashboardController.getDeviceControl);
router.post('/device-control', isAuthenticated, dashboardController.controlDevice);

// API routes for dashboard data
router.get('/sensor-data', isAuthenticated, dashboardController.getSensorData);
router.get('/device-logs', isAuthenticated, dashboardController.getDeviceLogs);
router.get('/sensor-history', isAuthenticated, dashboardController.getSensorHistory);
router.get('/export-sensor-data', isAuthenticated, dashboardController.exportSensorData);

module.exports = router;