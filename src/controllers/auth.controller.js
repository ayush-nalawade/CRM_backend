const db = require('../models');
const User = db.User;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { ValidationError, ConflictError } = require('../middlewares/error.middleware');

//User Register
const register = async (req, res) => {
    const { name, email, password, role } = req.body;
    const requestId = req.requestId;

    try {
        logger.info('User registration attempt', {
            requestId,
            email,
            role
        });

        // Validation
        if (!name || !email || !password) {
            throw new ValidationError('Name, email, and password are required');
        }

        if (password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters long');
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        const user = await User.create({ 
            name, 
            email, 
            password, 
            role: role || 'SalesStaff' 
        });

        logger.info('User registered successfully', {
            requestId,
            userId: user.id,
            email: user.email
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        logger.error('User registration failed', {
            requestId,
            error: err.message,
            email
        });
        throw err; // Let error middleware handle it
    }
};

//User login
const login = async (req, res) => {
    const { email, password } = req.body;
    const requestId = req.requestId;

    try {
        logger.info('User login attempt', {
            requestId,
            email
        });

        // Validation
        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new ValidationError('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new ValidationError('Invalid credentials');
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // generate refresh token
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookies
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000 // 15 mins
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        logger.info('User login successful', {
            requestId,
            userId: user.id,
            email: user.email
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: { 
                    id: user.id, 
                    name: user.name, 
                    email: user.email, 
                    role: user.role 
                }
            }
        });

    } catch (err) {
        logger.error('User login failed', {
            requestId,
            error: err.message,
            email
        });
        throw err; // Let error middleware handle it
    }
};



const refreshToken = async (req, res) => {
    const { refreshToken } = req.cookies;
    const requestId = req.requestId;

    try {
        logger.info('Token refresh attempt', { requestId });

        if (!refreshToken) {
            throw new ValidationError('Refresh token not found');
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
            throw new ValidationError('Invalid refresh token');
        }

        // Generate new access token
        const newToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('accessToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000 // 15 mins
        });

        logger.info('Token refreshed successfully', {
            requestId,
            userId: user.id
        });

        res.json({ 
            success: true,
            message: 'Token refreshed successfully' 
        });
    } catch (err) {
        logger.error('Token refresh failed', {
            requestId,
            error: err.message
        });
        throw err; // Let error middleware handle it
    }
};

const logout = async (req, res) => {
    const requestId = req.requestId;

    try {
        logger.info('User logout', {
            requestId,
            userId: req.user?.id
        });

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        res.json({ 
            success: true,
            message: 'Logged out successfully' 
        });
    } catch (err) {
        logger.error('Logout failed', {
            requestId,
            error: err.message
        });
        throw err;
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout
};
