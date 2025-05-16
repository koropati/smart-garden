const mqtt = require('mqtt');
const {
    getDb
} = require('../utils/database');
const fs = require('fs');
const path = require('path');

// Configuration from env variables
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `smart-garden-dashboard-${Math.random().toString(16).substring(2, 10)}`;
const MQTT_USE_SSL = process.env.MQTT_USE_SSL === 'true';
const MQTT_CA_FILE = process.env.MQTT_CA_FILE;

// MQTT Topics
const TOPICS = {
    TEMPERATURE: 'smart-garden/sensors/temperature',
    HUMIDITY: 'smart-garden/sensors/humidity',
    SOIL_MOISTURE: 'smart-garden/sensors/soil-moisture',
    VALVE_CONTROL: 'smart-garden/control/valve',
    VALVE_STATUS: 'smart-garden/status/valve'
};

let client = null;
let isConnected = false;

// Store latest sensor values
const latestValues = {
    temperature: null,
    humidity: null,
    soilMoisture: null,
    valveStatus: 'off'
};

// Connect to MQTT broker
const connect = () => {
    console.log(`Connecting to MQTT broker: ${MQTT_HOST}:${MQTT_PORT}`);

    // Prepare connection options
    const options = {
        clientId: MQTT_CLIENT_ID,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        port: MQTT_PORT
    };

    // Add authentication if provided
    if (MQTT_USERNAME && MQTT_PASSWORD) {
        options.username = MQTT_USERNAME;
        options.password = MQTT_PASSWORD;
    }

    // Add SSL/TLS support if enabled
    if (MQTT_USE_SSL) {
        options.protocol = 'mqtts';

        // Add CA certificate if provided
        if (MQTT_CA_FILE) {
            try {
                const caFilePath = path.resolve(MQTT_CA_FILE);
                if (fs.existsSync(caFilePath)) {
                    options.ca = fs.readFileSync(caFilePath);
                    console.log('Loaded CA certificate from:', caFilePath);
                } else {
                    console.error('CA file not found:', caFilePath);
                }
            } catch (error) {
                console.error('Error loading CA certificate:', error);
            }
        }

        // Require TLS with specific versions and disable rejected certs
        options.rejectUnauthorized = true;
    }

    // Create MQTT client
    const connectUrl = `${MQTT_USE_SSL ? 'mqtts' : 'mqtt'}://${MQTT_HOST}`;
    client = mqtt.connect(connectUrl, options);

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        isConnected = true;

        // Subscribe to all topics
        Object.values(TOPICS).forEach(topic => {
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error(`Error subscribing to ${topic}:`, err);
                } else {
                    console.log(`Subscribed to ${topic}`);
                }
            });
        });
    });

    client.on('message', (topic, message) => {
        const payload = message.toString();
        console.log(`Message received on ${topic}: ${payload}`);

        const db = getDb();

        switch (topic) {
            case TOPICS.TEMPERATURE:
                const temperature = parseFloat(payload);
                latestValues.temperature = temperature;
                // Store in DB
                db.run(
                    'INSERT INTO sensor_data (sensor_type, value) VALUES (?, ?)',
                    ['temperature', temperature]
                );
                break;

            case TOPICS.HUMIDITY:
                const humidity = parseFloat(payload);
                latestValues.humidity = humidity;
                // Store in DB
                db.run(
                    'INSERT INTO sensor_data (sensor_type, value) VALUES (?, ?)',
                    ['humidity', humidity]
                );
                break;

            case TOPICS.SOIL_MOISTURE:
                const soilMoisture = parseFloat(payload);
                latestValues.soilMoisture = soilMoisture;
                // Store in DB
                db.run(
                    'INSERT INTO sensor_data (sensor_type, value) VALUES (?, ?)',
                    ['soil_moisture', soilMoisture]
                );
                break;

            case TOPICS.VALVE_STATUS:
                const valveStatus = payload.toLowerCase();
                latestValues.valveStatus = valveStatus;
                // Store in DB
                db.run(
                    'INSERT INTO device_logs (device_name, action, status, performed_by) VALUES (?, ?, ?, ?)',
                    ['water_valve', 'status_update', valveStatus, 'system']
                );
                break;
        }
    });

    client.on('error', (err) => {
        console.error('MQTT connection error:', err);
        isConnected = false;
    });

    client.on('close', () => {
        console.log('MQTT connection closed');
        isConnected = false;
    });
};

// Disconnect from MQTT broker
const disconnect = () => {
    if (client) {
        client.end();
        isConnected = false;
    }
};

// Control the valve
const controlValve = (status, username) => {
    if (!client || !isConnected) {
        console.error('MQTT client not connected');
        return false;
    }

    const action = status ? 'on' : 'off';
    client.publish(TOPICS.VALVE_CONTROL, action);

    // Log the action
    const db = getDb();
    db.run(
        'INSERT INTO device_logs (device_name, action, status, performed_by) VALUES (?, ?, ?, ?)',
        ['water_valve', 'manual_control', action, username]
    );

    return true;
};

// Get latest sensor values
const getLatestValues = () => {
    return {
        ...latestValues
    };
};

module.exports = {
    connect,
    disconnect,
    controlValve,
    getLatestValues,
    TOPICS
};