/**
 * Smart Garden Dashboard Database Initialization Script
 * Run with: npm run init-db
 */

require('dotenv').config();
const {
    initDb
} = require('./database');
const path = require('path');
const fs = require('fs');

console.log('Initializing Smart Garden Database...');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    console.log('Creating data directory...');
    fs.mkdirSync(dataDir);
}

// Initialize database
initDb();

console.log('Database initialization complete!');
console.log('Default admin user created with:');
console.log('Username: admin');
console.log('Password: admin123');
console.log('');
console.log('Please change this password after first login!');