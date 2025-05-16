/**
 * Script untuk mempersiapkan sertifikat CA untuk MQTT
 * Jalankan dengan: node utils/prepare-certs.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Path sertifikat CA
const certPath = process.env.MQTT_CA_FILE || 'data/certs/isrgrootx1.pem';
const certDir = path.dirname(certPath);

// URL untuk mengunduh sertifikat ISRG Root X1
const isrgRootX1Url = 'https://letsencrypt.org/certs/isrgrootx1.pem';

// Memastikan direktori untuk sertifikat ada
console.log(`Memastikan direktori ${certDir} ada...`);
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, {
        recursive: true
    });
    console.log(`Direktori ${certDir} telah dibuat.`);
}

// Mengunduh sertifikat jika belum ada
console.log(`Memeriksa apakah file sertifikat sudah ada...`);
if (!fs.existsSync(certPath)) {
    console.log(`Mengunduh sertifikat ISRG Root X1 dari ${isrgRootX1Url}...`);

    const file = fs.createWriteStream(certPath);

    https.get(isrgRootX1Url, function (response) {
        response.pipe(file);

        file.on('finish', function () {
            file.close();
            console.log(`Sertifikat ISRG Root X1 telah diunduh dan disimpan di ${certPath}`);
        });
    }).on('error', function (err) {
        fs.unlink(certPath);
        console.error('Error mengunduh sertifikat:', err.message);
    });
} else {
    console.log(`File sertifikat sudah ada di ${certPath}`);
}

console.log('\nPersiapan sertifikat selesai!');
console.log('Jika menggunakan sertifikat berbeda, silahkan ganti file sertifikat secara manual.');