const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.field = field;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
        this.name = 'ConflictError';
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = req.startTime || Date.now();
    const responseTime = Date.now() - startTime;

    // Log the error
    logger.error('Error occurred', {
        requestId,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code,
            statusCode: err.statusCode
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous'
        },
        responseTime: `${responseTime}ms`
    });

    // Determine error status code
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let code = err.code || 'INTERNAL_ERROR';

    // Handle specific error types
    if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409;
        code = 'CONFLICT_ERROR';
        message = 'Resource already exists';
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400;
        code = 'FOREIGN_KEY_ERROR';
        message = 'Referenced resource does not exist';
    } else if (err.name === 'SequelizeDatabaseError') {
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'JWT_ERROR';
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'JWT_EXPIRED';
        message = 'Token expired';
    } else if (err.name === 'MulterError') {
        statusCode = 400;
        code = 'FILE_UPLOAD_ERROR';
        message = 'File upload error';
    } else if (err.name === 'SyntaxError' && err.status === 400) {
        statusCode = 400;
        code = 'JSON_PARSE_ERROR';
        message = 'Invalid JSON format';
    }

    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        },
        meta: {
            requestId,
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`
        }
    };

    // Add validation details if available
    if (err.errors && Array.isArray(err.errors)) {
        errorResponse.error.details = err.errors.map(e => ({
            field: e.path || e.field,
            message: e.message,
            value: e.value
        }));
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.warn('Route not found', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip
    });

    const error = new NotFoundError('Route');
    error.requestId = requestId;
    next(error);
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Request timeout handler
const timeoutHandler = (timeout = 30000) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            const error = new AppError('Request timeout', 408, 'TIMEOUT_ERROR');
            next(error);
        }, timeout);

        res.on('finish', () => {
            clearTimeout(timer);
        });

        next();
    };
};

// Rate limiting error handler
const rateLimitHandler = (req, res, next) => {
    const error = new RateLimitError('Too many requests from this IP');
    next(error);
};

// Security error handlers
const securityErrorHandler = (err, req, res, next) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        logger.warn('Connection reset by client', {
            requestId: req.requestId,
            error: err.message
        });
        return res.status(499).end(); // Client closed request
    }

    if (err.code === 'ENOTFOUND') {
        logger.error('DNS lookup failed', {
            requestId: req.requestId,
            error: err.message
        });
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service temporarily unavailable'
            }
        });
    }

    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    timeoutHandler,
    rateLimitHandler,
    securityErrorHandler,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError
}; 