const {
    getDb
} = require('../utils/database');
const mqttService = require('../services/mqttService');

// Render dashboard home
const getDashboard = (req, res) => {
    const latestValues = mqttService.getLatestValues();

    res.render('dashboard/index', {
        title: 'Smart Garden Dashboard',
        user: req.session.user,
        latestValues
    });
};

// Get sensor data for charts
const getSensorData = (req, res) => {
    const {
        type,
        timeRange
    } = req.query;

    // Define allowed sensor types
    const allowedTypes = ['temperature', 'humidity', 'soil_moisture'];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({
            error: 'Invalid sensor type'
        });
    }

    // Define time filter based on range
    let timeFilter = '';
    const now = new Date();

    switch (timeRange) {
        case 'hour':
            timeFilter = `AND timestamp >= datetime('now', '-1 hour')`;
            break;
        case 'day':
            timeFilter = `AND timestamp >= datetime('now', '-1 day')`;
            break;
        case 'week':
            timeFilter = `AND timestamp >= datetime('now', '-7 days')`;
            break;
        case 'month':
            timeFilter = `AND timestamp >= datetime('now', '-30 days')`;
            break;
        default:
            timeFilter = `AND timestamp >= datetime('now', '-1 day')`;
    }

    const db = getDb();

    const query = `
    SELECT value, timestamp
    FROM sensor_data
    WHERE sensor_type = ? ${timeFilter}
    ORDER BY timestamp ASC
  `;

    db.all(query, [type], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                error: 'Database error'
            });
        }

        // Format data for charts
        const data = rows.map(row => ({
            value: row.value,
            timestamp: new Date(row.timestamp)
        }));

        res.json({
            data
        });
    });
};

// Get device logs
const getDeviceLogs = (req, res) => {
    const {
        device,
        limit
    } = req.query;
    const limitValue = parseInt(limit) || 10;

    let query = `
    SELECT device_name, action, status, performed_by, timestamp
    FROM device_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `;

    let params = [limitValue];

    if (device) {
        query = `
      SELECT device_name, action, status, performed_by, timestamp
      FROM device_logs
      WHERE device_name = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
        params = [device, limitValue];
    }

    const db = getDb();

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                error: 'Database error'
            });
        }

        res.json({
            logs: rows
        });
    });
};

// Render device control page
const getDeviceControl = (req, res) => {
    const latestValues = mqttService.getLatestValues();

    const db = getDb();

    // Get recent logs for the valve
    db.all(
        `SELECT action, status, performed_by, timestamp
     FROM device_logs
     WHERE device_name = 'water_valve'
     ORDER BY timestamp DESC
     LIMIT 10`,
        [],
        (err, logs) => {
            if (err) {
                console.error('Database error:', err);
                logs = [];
            }

            res.render('dashboard/device-control', {
                title: 'Kontrol Perangkat',
                user: req.session.user,
                latestValues,
                logs
            });
        }
    );
};

// Control device
const controlDevice = (req, res) => {
    const {
        device,
        action
    } = req.body;

    if (device !== 'water_valve') {
        return res.status(400).json({
            success: false,
            message: 'Unsupported device'
        });
    }

    if (action !== 'on' && action !== 'off') {
        return res.status(400).json({
            success: false,
            message: 'Invalid action'
        });
    }

    const status = action === 'on';
    const result = mqttService.controlValve(status, req.session.user.username);

    if (!result) {
        return res.status(500).json({
            success: false,
            message: 'Failed to control device'
        });
    }

    res.json({
        success: true,
        message: `Successfully turned ${action} the water valve`
    });
};

module.exports = {
    getDashboard,
    getSensorData,
    getDeviceLogs,
    getDeviceControl,
    controlDevice
};