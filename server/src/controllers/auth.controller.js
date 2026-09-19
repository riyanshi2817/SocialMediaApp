const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const getCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
});

const createToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured on the server.');
    }

    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

async function registerController(req, res) {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    const cleanedUsername = String(username).trim();
    const cleanedPassword = String(password);

    if (cleanedUsername.length < 3 || cleanedUsername.length > 50) {
        return res.status(400).json({
            success: false,
            message: 'Username must be between 3 and 50 characters long'
        });
    }

    if (cleanedPassword.length < 6 || cleanedPassword.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Password must be between 6 and 128 characters long'
        });
    }

    try {
        const isUserAlreadyExist = await UserModel.findOne({ username: cleanedUsername });

        if (isUserAlreadyExist) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        const user = await UserModel.create({
            username: cleanedUsername,
            password: bcrypt.hashSync(cleanedPassword, 10)
        });

        const token = createToken(user._id);
        res.cookie('token', token, getCookieOptions());

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Register error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
}

async function loginController(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    const cleanedUsername = String(username).trim();

    if (cleanedUsername.length > 50 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Invalid credentials format'
        });
    }

    try {
        const user = await UserModel.findOne({ username: cleanedUsername });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isPasswordIsValid = await bcrypt.compare(String(password), user.password);

        if (!isPasswordIsValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = createToken(user._id);
        res.cookie('token', token, getCookieOptions());

        return res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
}

async function logoutController(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });

    return res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
}

async function getCurrentUserController(req, res) {
    const user = req.user;

    return res.status(200).json({
        success: true,
        user: {
            id: user._id,
            username: user.username
        }
    });
}

module.exports = {
    registerController,
    loginController,
    logoutController,
    getCurrentUserController
};