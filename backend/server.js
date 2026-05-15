const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { adminAuth } = require('./middleware/auth-middleware');

dotenv.config();

const BUILD_VERSION = 'v2.1.0-cloudinary-2b75873';
console.log(`[SERVER] Starting ${BUILD_VERSION} at ${new Date().toISOString()}`);
console.log('[SERVER] CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT SET');
console.log('[SERVER] CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('[SERVER] CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ NOT SET');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// ── Health + Debug (BEFORE rate limiting) ────────────────────────────────────
app.get('/', (req, res) => {
    res.send(`Nihongo Learning Platform API is running | ${BUILD_VERSION}`);
});

app.get('/api/debug/cloudinary-status', (req, res) => {
    res.json({
        version: BUILD_VERSION,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET (' + process.env.CLOUDINARY_CLOUD_NAME + ')' : 'MISSING',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV || 'not set',
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
        serverTime: new Date().toISOString()
    });
});

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many API requests, please try again later'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nihongo')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', adminAuth, require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/certificates', require('./routes/certificates'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] ${BUILD_VERSION} listening on port ${PORT}`);
});

