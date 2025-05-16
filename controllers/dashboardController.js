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

// Get sensor history with pagination
const getSensorHistory = (req, res) => {
    const { type = 'temperature', page = 1, limit = 20, startDate, endDate } = req.query;
    const pageNumber = parseInt(page) || 1;
    const limitPerPage = parseInt(limit) || 20;
    const offset = (pageNumber - 1) * limitPerPage;
    
    // Define allowed sensor types
    const allowedTypes = ['temperature', 'humidity', 'soil_moisture', 'all'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(400).render('error', {
            error: { message: 'Invalid sensor type' }
        });
    }
    
    const db = getDb();
    let params = [];
    let typeFilter = '';
    
    if (type !== 'all') {
        typeFilter = 'WHERE sensor_type = ?';
        params.push(type);
    }
    
    // Add date filtering if provided
    let dateFilter = '';
    if (startDate && endDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp >= ?';
        params.push(startDate);
    } else if (endDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp <= ?';
        params.push(endDate);
    }
    
    // Get total count for pagination
    const countQuery = `
        SELECT COUNT(*) as total
        FROM sensor_data
        ${typeFilter}${dateFilter}
    `;
    
    db.get(countQuery, params, (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).render('error', {
                error: { message: 'Database error', stack: err.stack }
            });
        }
        
        const total = countResult.total;
        const totalPages = Math.ceil(total / limitPerPage);
        
        // Get data with pagination
        const dataQuery = `
            SELECT id, sensor_type, value, timestamp
            FROM sensor_data
            ${typeFilter}${dateFilter}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `;
        
        const dataParams = [...params, limitPerPage, offset];
        
        db.all(dataQuery, dataParams, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).render('error', {
                    error: { message: 'Database error', stack: err.stack }
                });
            }
            
            // Format data for display
            const formattedData = rows.map(row => ({
                id: row.id,
                sensorType: row.sensor_type,
                value: row.value,
                timestamp: new Date(row.timestamp)
            }));
            
            res.render('dashboard/sensor-history', {
                title: 'History Data Sensor',
                user: req.session.user,
                data: formattedData,
                currentPage: pageNumber,
                totalPages,
                totalItems: total,
                type,
                limit: limitPerPage,
                startDate,
                endDate
            });
        });
    });
};

const exportSensorData = (req, res) => {
    const { type = 'temperature', startDate, endDate } = req.query;
    
    // Define allowed sensor types
    const allowedTypes = ['temperature', 'humidity', 'soil_moisture', 'all'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(400).send('Invalid sensor type');
    }
    
    const db = getDb();
    let params = [];
    let typeFilter = '';
    
    if (type !== 'all') {
        typeFilter = 'WHERE sensor_type = ?';
        params.push(type);
    }
    
    // Add date filtering if provided
    let dateFilter = '';
    if (startDate && endDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp >= ?';
        params.push(startDate);
    } else if (endDate) {
        dateFilter = type !== 'all' ? ' AND' : ' WHERE';
        dateFilter += ' timestamp <= ?';
        params.push(endDate);
    }
    
    const query = `
        SELECT sensor_type, value, timestamp
        FROM sensor_data
        ${typeFilter}${dateFilter}
        ORDER BY timestamp DESC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        
        // Format data for CSV
        const formattedData = rows.map(row => ({
            sensor_type: row.sensor_type === 'temperature' ? 'Suhu' : 
                        row.sensor_type === 'humidity' ? 'Kelembaban Udara' : 'Kelembaban Tanah',
            value: row.value.toFixed(1) + (row.sensor_type === 'temperature' ? ' °C' : ' %'),
            timestamp: new Date(row.timestamp).toLocaleString('id-ID')
        }));
        
        // Create CSV content
        let csv = 'Tipe Sensor,Nilai,Tanggal & Waktu\n';
        formattedData.forEach(item => {
            csv += `"${item.sensor_type}","${item.value}","${item.timestamp}"\n`;
        });
        
        // Set headers for file download
        const today = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sensor_data_${today}.csv`);
        
        res.send(csv);
    });
};

module.exports = {
    getDashboard,
    getSensorData,
    getDeviceLogs,
    getDeviceControl,
    controlDevice,
    getSensorHistory,
    exportSensorData
};