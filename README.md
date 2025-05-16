smart-garden-dashboard/
├── app.js                  # File utama aplikasi
├── config/
│   └── database.js         # Konfigurasi database
├── controllers/
│   ├── authController.js   # Controller untuk autentikasi
│   ├── dashboardController.js  # Controller untuk dashboard
│   └── deviceController.js # Controller untuk kontrol perangkat
├── middleware/
│   └── authMiddleware.js   # Middleware untuk autentikasi
├── models/
│   ├── User.js             # Model untuk user
│   ├── SensorData.js       # Model untuk data sensor
│   └── DeviceLog.js        # Model untuk log perangkat
├── public/
│   ├── css/
│   │   └── style.css       # CSS kustom
│   ├── js/
│   │   ├── dashboard.js    # JavaScript untuk dashboard
│   │   └── device-control.js # JavaScript untuk kontrol perangkat
│   └── img/                # Folder untuk gambar
├── routes/
│   ├── authRoutes.js       # Route untuk autentikasi
│   ├── dashboardRoutes.js  # Route untuk dashboard
│   └── apiRoutes.js        # Route untuk API
├── services/
│   └── mqttService.js      # Service untuk MQTT
├── utils/
│   └── database.js         # Utilitas database
├── views/
│   ├── auth/
│   │   ├── login.ejs       # Halaman login
│   │   └── change-password.ejs # Halaman ganti password
│   ├── dashboard/
│   │   ├── index.ejs       # Halaman utama dashboard
│   │   └── device-control.ejs # Halaman kontrol perangkat
│   └── partials/
│       ├── header.ejs      # Partial header
│       ├── footer.ejs      # Partial footer
│       └── sidebar.ejs     # Partial sidebar
├── .env                    # File environment variables
├── .gitignore              # File gitignore
└── package.json            # File package.json