const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const memberDataRoutes = require('./routes/memberDataRoutes');

const app = express();
const port = 3000;

// CORS configuration
const allowedOrigins = [
    "https://localhost:4200",
    "http://localhost:4200",
    "http://localhost:1234",
    "https://ubs-admin.netlify.app",
    "https://ubs-member-data.vercel.app",
    "https://ubs-member-data-ui.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                          /localhost/.test(origin) ||
                          /127\.0\.0\.1/.test(origin) ||
                          /\.vercel\.app$/.test(origin) ||
                          /\.netlify\.app$/.test(origin);
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static UI assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/MemberData', memberDataRoutes);
app.use('/api/memberdata', memberDataRoutes);
app.use('/api/entrypass', memberDataRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// SPA Fallback
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});

module.exports = app;

