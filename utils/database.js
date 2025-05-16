const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Database setup
const dbPath = path.join(dataDir, 'smart_garden.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schemas
const initDb = () => {
    // Create Users table
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create SensorData table
    db.run(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create DeviceLog table
    db.run(`
    CREATE TABLE IF NOT EXISTS device_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      performed_by TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Check if default admin exists, create if not
    db.get(`SELECT * FROM users WHERE username = 'admin'`, [], (err, row) => {
        if (err) {
            console.error('Error checking for admin user:', err);
            return;
        }

        if (!row) {
            // Create default admin user
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(
                `INSERT INTO users (username, password) VALUES (?, ?)`,
                ['admin', hashedPassword],
                (err) => {
                    if (err) {
                        console.error('Error creating admin user:', err);
                        return;
                    }
                    console.log('Default admin user created with password: admin123');
                }
            );
        }
    });
};

// Get database connection
const getDb = () => db;

module.exports = {
    initDb,
    getDb
};