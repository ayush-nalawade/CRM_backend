const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('../models');
const User = db.User;

exports.protect = async (req, res, next) => {
    let token = req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: {
                code: 'AUTHENTICATION_ERROR',
                message: 'Not authenticated'
            }
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (err) {
        
        //Refresh Token logic

        // Token expired or invalid
        if (err.name === 'TokenExpiredError') {
            // Try to refresh token
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ 
                    success: false,
                    error: {
                        code: 'SESSION_EXPIRED',
                        message: 'Session expired. Please login again.'
                    }
                });
            }

            try {
                const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
                const user = await User.findByPk(decodedRefresh.id);

                if (!user) {
                    return res.status(401).json({ 
                        success: false,
                        error: {
                            code: 'USER_NOT_FOUND',
                            message: 'User not found.'
                        }
                    });
                }

                const newAccessToken = jwt.sign(
                    { id: user.id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '15m' }
                );

                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict',
                    maxAge: 15 * 60 * 1000 // 15 mins
                });

                req.user = { id: user.id, role: user.role };
                return next();
            } catch (refreshErr) {
                console.error(refreshErr);
                return res.status(401).json({ 
                    success: false,
                    error: {
                        code: 'SESSION_EXPIRED',
                        message: 'Session expired. Please login again.'
                    }
                });
            }
        } else {
            console.error(err);
            return res.status(401).json({ 
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token.'
                }
            });
        }
    }
};



// Optional role-based middleware
exports.adminOnly = (req, res, next) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ 
            success: false,
            error: {
                code: 'AUTHORIZATION_ERROR',
                message: 'Access denied: Admins only'
            }
        });
    }
    next();
};
