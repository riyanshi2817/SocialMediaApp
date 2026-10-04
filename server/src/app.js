const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

function createRateLimiter({ windowMs, max }) {
    const requests = new Map();
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of requests) {
            if (entry.resetAt <= now) requests.delete(key);
        }
    }, windowMs);
    cleanup.unref();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip;
        const current = requests.get(key);

        if (!current || current.resetAt <= now) {
            requests.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= max) {
            res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please wait and try again.'
            });
        }

        current.count += 1;
        next();
    };
}

const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const captionRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
        const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
            .split(',')
            .map(value => value.trim().replace(/\/$/, ''))
            .filter(Boolean);
        const allowedOrigins = new Set([
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            ...configuredOrigins
        ]);

        if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
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

app.post(['/api/auth/register', '/api/auth/login'], authRateLimiter);
app.use('/api/auth', authRoutes);
app.post('/api/posts', captionRateLimiter);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

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
