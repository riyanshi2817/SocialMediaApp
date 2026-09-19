const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
    next();
});
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.CLIENT_ORIGIN || 'http://localhost:5173',
            'http://127.0.0.1:5173'
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error('Unhandled API error:', err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'Image size exceeds the 5MB limit.'
        });
    }

    if (err.message === 'Unsupported image type. Please upload a JPG, PNG, or WEBP image.') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Request body is too large.'
        });
    }

    if (err.message === 'Origin is not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'Request origin is not allowed.'
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Malformed JSON request.'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

module.exports = app;