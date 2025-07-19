const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Current log level (can be set via environment variable)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class Logger {
    constructor() {
        this.logDir = 'logs';
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level,
            message,
            ...(data && { data })
        };

        return JSON.stringify(logEntry);
    }

    writeToFile(level, message, data = null) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${level.toLowerCase()}-${today}.log`);
        const logEntry = this.formatMessage(level, message, data) + '\n';

        fs.appendFileSync(logFile, logEntry, 'utf8');
    }

    getConsoleColor(level) {
        switch (level) {
            case 'ERROR': return colors.red;
            case 'WARN': return colors.yellow;
            case 'INFO': return colors.green;
            case 'DEBUG': return colors.cyan;
            default: return colors.reset;
        }
    }

    log(level, message, data = null) {
        if (LOG_LEVELS[level] <= CURRENT_LOG_LEVEL) {
            const color = this.getConsoleColor(level);
            const timestamp = this.getTimestamp();
            
            // Console output
            console.log(`${color}[${timestamp}] [${level}]${colors.reset} ${message}`);
            if (data) {
                console.log(`${color}${JSON.stringify(data, null, 2)}${colors.reset}`);
            }

            // File output
            this.writeToFile(level, message, data);
        }
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    // Request logging
    logRequest(req, res, next) {
        const startTime = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add request ID to request object
        req.requestId = requestId;
        req.startTime = startTime;
        
        this.info('HTTP Request Started', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous'
        });

        // Override res.json to log response
        const originalJson = res.json;
        const logger = this;
        
        res.json = function(data) {
            const responseTime = Date.now() - startTime;
            
            logger.info('HTTP Request Completed', {
                requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                responseSize: JSON.stringify(data).length
            });

            return originalJson.call(this, data);
        };

        next();
    }

    // Database operation logging
    logDatabaseOperation(operation, table, data = null, error = null) {
        if (error) {
            this.error(`Database ${operation} failed`, {
                table,
                error: error.message,
                stack: error.stack,
                data
            });
        } else {
            this.info(`Database ${operation} successful`, {
                table,
                data
            });
        }
    }

    // Performance logging
    logPerformance(operation, duration, details = null) {
        const level = duration > 1000 ? 'WARN' : 'INFO';
        this.log(level, `Performance: ${operation} took ${duration}ms`, details);
    }

    // Security logging
    logSecurityEvent(event, details = null) {
        this.warn(`Security Event: ${event}`, details);
    }

    // Business logic logging
    logBusinessEvent(event, details = null) {
        this.info(`Business Event: ${event}`, details);
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 