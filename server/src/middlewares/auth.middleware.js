const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

async function authMiddleware(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized access, please login first'
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Authentication is temporarily unavailable.'
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token, please login again'
        });
    }

    try {
        const user = await userModel.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found, please login again'
            });
        }
        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        console.error('Authentication lookup error:', error.message);
        return res.status(500).json({ success: false, message: 'Authentication is temporarily unavailable.' });
    }
}

async function optionalAuthMiddleware(req, res, next) {
    const token = req.cookies?.token;
    if (token && process.env.JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.userId);
            if (user) {
                req.user = user;
                req.userId = user._id;
            }
        } catch (error) {
            // A public profile remains readable with an expired or invalid cookie.
        }
    }
    next();
}

module.exports = authMiddleware;
module.exports.optional = optionalAuthMiddleware;
