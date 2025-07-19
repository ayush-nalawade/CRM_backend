const { ValidationError } = require('./error.middleware');
const logger = require('../utils/logger');

// Common validation patterns
const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s\-\(\)]{10,}$/,
    url: /^https?:\/\/.+/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    sku: /^[A-Z0-9\-_]{3,50}$/,
    price: /^\d+(\.\d{1,2})?$/,
    integer: /^\d+$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
    date: /^\d{4}-\d{2}-\d{2}$/
};

// Validation utilities
const validators = {
    required: (value, fieldName) => {
        if (value === undefined || value === null || value === '') {
            throw new ValidationError(`${fieldName} is required`);
        }
        return true;
    },

    string: (value, fieldName) => {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new ValidationError(`${fieldName} must be a string`);
        }
        return true;
    },

    number: (value, fieldName) => {
        if (value !== undefined && value !== null && isNaN(parseFloat(value))) {
            throw new ValidationError(`${fieldName} must be a valid number`);
        }
        return true;
    },

    integer: (value, fieldName) => {
        if (value !== undefined && value !== null && !Number.isInteger(parseFloat(value))) {
            throw new ValidationError(`${fieldName} must be an integer`);
        }
        return true;
    },

    positive: (value, fieldName) => {
        if (value !== undefined && value !== null && parseFloat(value) <= 0) {
            throw new ValidationError(`${fieldName} must be a positive number`);
        }
        return true;
    },

    minLength: (value, fieldName, min) => {
        if (value !== undefined && value !== null && value.toString().length < min) {
            throw new ValidationError(`${fieldName} must be at least ${min} characters long`);
        }
        return true;
    },

    maxLength: (value, fieldName, max) => {
        if (value !== undefined && value !== null && value.toString().length > max) {
            throw new ValidationError(`${fieldName} cannot exceed ${max} characters`);
        }
        return true;
    },

    min: (value, fieldName, min) => {
        if (value !== undefined && value !== null && parseFloat(value) < min) {
            throw new ValidationError(`${fieldName} must be at least ${min}`);
        }
        return true;
    },

    max: (value, fieldName, max) => {
        if (value !== undefined && value !== null && parseFloat(value) > max) {
            throw new ValidationError(`${fieldName} cannot exceed ${max}`);
        }
        return true;
    },

    pattern: (value, fieldName, pattern, description) => {
        if (value !== undefined && value !== null && !pattern.test(value.toString())) {
            throw new ValidationError(`${fieldName} must match the pattern: ${description}`);
        }
        return true;
    },

    email: (value, fieldName) => {
        return validators.pattern(value, fieldName, patterns.email, 'valid email address');
    },

    url: (value, fieldName) => {
        return validators.pattern(value, fieldName, patterns.url, 'valid URL');
    },

    sku: (value, fieldName) => {
        return validators.pattern(value, fieldName, patterns.sku, 'valid SKU format (3-50 alphanumeric characters)');
    },

    price: (value, fieldName) => {
        return validators.pattern(value, fieldName, patterns.price, 'valid price format');
    },

    in: (value, fieldName, allowedValues) => {
        if (value !== undefined && value !== null && !allowedValues.includes(value)) {
            throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
        }
        return true;
    },

    array: (value, fieldName) => {
        if (value !== undefined && value !== null && !Array.isArray(value)) {
            throw new ValidationError(`${fieldName} must be an array`);
        }
        return true;
    },

    object: (value, fieldName) => {
        if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
            throw new ValidationError(`${fieldName} must be an object`);
        }
        return true;
    },

    boolean: (value, fieldName) => {
        if (value !== undefined && value !== null && typeof value !== 'boolean') {
            throw new ValidationError(`${fieldName} must be a boolean`);
        }
        return true;
    },

    date: (value, fieldName) => {
        if (value !== undefined && value !== null) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new ValidationError(`${fieldName} must be a valid date`);
            }
        }
        return true;
    },

    futureDate: (value, fieldName) => {
        if (value !== undefined && value !== null) {
            const date = new Date(value);
            const now = new Date();
            if (date <= now) {
                throw new ValidationError(`${fieldName} must be a future date`);
            }
        }
        return true;
    },

    pastDate: (value, fieldName) => {
        if (value !== undefined && value !== null) {
            const date = new Date(value);
            const now = new Date();
            if (date >= now) {
                throw new ValidationError(`${fieldName} must be a past date`);
            }
        }
        return true;
    }
};

// Sanitization utilities
const sanitizers = {
    trim: (value) => typeof value === 'string' ? value.trim() : value,
    
    toLowerCase: (value) => typeof value === 'string' ? value.toLowerCase() : value,
    
    toUpperCase: (value) => typeof value === 'string' ? value.toUpperCase() : value,
    
    toNumber: (value) => value !== undefined && value !== null ? parseFloat(value) : value,
    
    toInteger: (value) => value !== undefined && value !== null ? parseInt(value) : value,
    
    toBoolean: (value) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    },
    
    escapeHtml: (value) => {
        if (typeof value !== 'string') return value;
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    },
    
    removeSpecialChars: (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/[^a-zA-Z0-9\s]/g, '');
    }
};

// Validation schema builder
class ValidationSchema {
    constructor() {
        this.rules = [];
        this.sanitizers = [];
    }

    required() {
        this.rules.push((value, fieldName) => validators.required(value, fieldName));
        return this;
    }

    string() {
        this.rules.push((value, fieldName) => validators.string(value, fieldName));
        return this;
    }

    number() {
        this.rules.push((value, fieldName) => validators.number(value, fieldName));
        return this;
    }

    integer() {
        this.rules.push((value, fieldName) => validators.integer(value, fieldName));
        return this;
    }

    positive() {
        this.rules.push((value, fieldName) => validators.positive(value, fieldName));
        return this;
    }

    minLength(min) {
        this.rules.push((value, fieldName) => validators.minLength(value, fieldName, min));
        return this;
    }

    maxLength(max) {
        this.rules.push((value, fieldName) => validators.maxLength(value, fieldName, max));
        return this;
    }

    min(min) {
        this.rules.push((value, fieldName) => validators.min(value, fieldName, min));
        return this;
    }

    max(max) {
        this.rules.push((value, fieldName) => validators.max(value, fieldName, max));
        return this;
    }

    email() {
        this.rules.push((value, fieldName) => validators.email(value, fieldName));
        return this;
    }

    url() {
        this.rules.push((value, fieldName) => validators.url(value, fieldName));
        return this;
    }

    sku() {
        this.rules.push((value, fieldName) => validators.sku(value, fieldName));
        return this;
    }

    price() {
        this.rules.push((value, fieldName) => validators.price(value, fieldName));
        return this;
    }

    in(allowedValues) {
        this.rules.push((value, fieldName) => validators.in(value, fieldName, allowedValues));
        return this;
    }

    array() {
        this.rules.push((value, fieldName) => validators.array(value, fieldName));
        return this;
    }

    object() {
        this.rules.push((value, fieldName) => validators.object(value, fieldName));
        return this;
    }

    boolean() {
        this.rules.push((value, fieldName) => validators.boolean(value, fieldName));
        return this;
    }

    date() {
        this.rules.push((value, fieldName) => validators.date(value, fieldName));
        return this;
    }

    futureDate() {
        this.rules.push((value, fieldName) => validators.futureDate(value, fieldName));
        return this;
    }

    pastDate() {
        this.rules.push((value, fieldName) => validators.pastDate(value, fieldName));
        return this;
    }

    // Sanitizers
    trim() {
        this.sanitizers.push(sanitizers.trim);
        return this;
    }

    toLowerCase() {
        this.sanitizers.push(sanitizers.toLowerCase);
        return this;
    }

    toUpperCase() {
        this.sanitizers.push(sanitizers.toUpperCase);
        return this;
    }

    toNumber() {
        this.sanitizers.push(sanitizers.toNumber);
        return this;
    }

    toInteger() {
        this.sanitizers.push(sanitizers.toInteger);
        return this;
    }

    toBoolean() {
        this.sanitizers.push(sanitizers.toBoolean);
        return this;
    }

    escapeHtml() {
        this.sanitizers.push(sanitizers.escapeHtml);
        return this;
    }

    removeSpecialChars() {
        this.sanitizers.push(sanitizers.removeSpecialChars);
        return this;
    }

    // Validate and sanitize
    validate(value, fieldName) {
        let sanitizedValue = value;

        // Apply sanitizers first
        for (const sanitizer of this.sanitizers) {
            sanitizedValue = sanitizer(sanitizedValue);
        }

        // Apply validation rules
        for (const rule of this.rules) {
            rule(sanitizedValue, fieldName);
        }

        return sanitizedValue;
    }
}

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const errors = [];
        const sanitizedData = {};

        try {
            // Validate each field in the schema
            for (const [fieldName, fieldSchema] of Object.entries(schema)) {
                try {
                    const value = req.body[fieldName] !== undefined ? req.body[fieldName] : req.query[fieldName];
                    const sanitizedValue = fieldSchema.validate(value, fieldName);
                    sanitizedData[fieldName] = sanitizedValue;
                } catch (error) {
                    errors.push({
                        field: fieldName,
                        message: error.message
                    });
                }
            }

            if (errors.length > 0) {
                logger.warn('Validation failed', {
                    requestId,
                    errors,
                    body: req.body,
                    query: req.query
                });

                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: errors
                    },
                    meta: {
                        requestId,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Add sanitized data to request
            req.sanitizedData = sanitizedData;
            next();

        } catch (error) {
            logger.error('Validation middleware error', {
                requestId,
                error: error.message,
                stack: error.stack
            });

            next(error);
        }
    };
};

// Common validation schemas
const commonSchemas = {
    id: new ValidationSchema().required().integer().positive(),
    email: new ValidationSchema().required().email().trim().toLowerCase(),
    password: new ValidationSchema().required().minLength(8).maxLength(128),
    name: new ValidationSchema().required().string().minLength(1).maxLength(255).trim(),
    price: new ValidationSchema().required().number().positive().max(999999.99),
    sku: new ValidationSchema().required().sku().trim().toUpperCase(),
    url: new ValidationSchema().url().trim(),
    phone: new ValidationSchema().required().string().trim(),
    date: new ValidationSchema().date(),
    boolean: new ValidationSchema().boolean()
};

module.exports = {
    ValidationSchema,
    validate,
    validators,
    sanitizers,
    patterns,
    commonSchemas
}; 