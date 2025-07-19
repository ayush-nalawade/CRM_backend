const db = require('../models');
const Customer = db.Customer;
const Purchase = db.Purchase;
const PurchaseItem = db.PurchaseItem;
const Product = db.Product;
const ProductVariant = db.ProductVariant;
const { ValidationError, DatabaseError } = require('sequelize');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ==================== VALIDATION SCHEMAS ====================

// Validation schemas will be implemented later

// ==================== CRUD OPERATIONS ====================

// Get all customers with search, filtering, and pagination
exports.getAllCustomers = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] [GET_CUSTOMERS] Request started`, {
        query: req.query,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        const {
            page = 1,
            limit = 10,
            search,
            customerType,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        // Input validation
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Page must be a positive integer'
                },
                requestId
            });
        }
        
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Limit must be between 1 and 100'
                },
                requestId
            });
        }

        const offset = (pageNum - 1) * limitNum;
        const whereClause = { isActive: true };

        // Search functionality
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const sanitizedSearch = search.trim().replace(/[%_]/g, '\\$&');
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { phone: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { email: { [Op.iLike]: `%${sanitizedSearch}%` } }
            ];
        }

        // Filter by customer type
        if (customerType && ['Regular', 'VIP', 'Wholesale'].includes(customerType)) {
            whereClause.customerType = customerType;
        }

        // Validate sort parameters
        const allowedSortFields = ['id', 'name', 'phone', 'email', 'customerType', 'totalSpent', 'totalPurchases', 'createdAt', 'updatedAt'];
        const allowedSortOrders = ['ASC', 'DESC'];
        
        if (!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`
                },
                requestId
            });
        }
        
        if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Sort order must be ASC or DESC'
                },
                requestId
            });
        }

        logger.info(`[${requestId}] [GET_CUSTOMERS] Query parameters:`, {
            whereClause,
            sortBy,
            sortOrder: sortOrder.toUpperCase(),
            limit: limitNum,
            offset
        });

        const { count, rows: customers } = await Customer.findAndCountAll({
            where: whereClause,
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: limitNum,
            offset: parseInt(offset),
            attributes: [
                'id', 'name', 'phone', 'email', 'address', 'birthday', 
                'customerType', 'notes', 'totalPurchases', 'totalSpent', 
                'lastPurchaseDate', 'createdAt', 'updatedAt'
            ]
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [GET_CUSTOMERS] Request completed successfully`, {
            customersFound: count,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                customers,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(count / limitNum),
                    totalItems: count,
                    itemsPerPage: limitNum
                }
            },
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [GET_CUSTOMERS] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to retrieve customers at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while retrieving customers'
            },
            requestId
        });
    }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { id } = req.params;
    
    logger.info(`[${requestId}] [GET_CUSTOMER_BY_ID] Request started`, {
        customerId: id,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Input validation
        if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
            logger.warn(`[${requestId}] [GET_CUSTOMER_BY_ID] Invalid customer ID: ${id}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Customer ID must be a positive integer'
                },
                requestId
            });
        }

        const customerId = parseInt(id);
        
        logger.info(`[${requestId}] [GET_CUSTOMER_BY_ID] Fetching customer with ID: ${customerId}`);

        const customer = await Customer.findOne({
            where: { id: customerId, isActive: true },
            attributes: [
                'id', 'name', 'phone', 'email', 'address', 'birthday', 
                'customerType', 'notes', 'totalPurchases', 'totalSpent', 
                'lastPurchaseDate', 'createdAt', 'updatedAt'
            ]
        });

        if (!customer) {
            logger.warn(`[${requestId}] [GET_CUSTOMER_BY_ID] Customer not found: ${customerId}`);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `No customer found with ID: ${customerId}`
                },
                requestId
            });
        }

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [GET_CUSTOMER_BY_ID] Customer retrieved successfully`, {
            customerId,
            customerName: customer.name,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: customer,
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [GET_CUSTOMER_BY_ID] Error occurred:`, {
            customerId: id,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to retrieve customer at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while retrieving the customer'
            },
            requestId
        });
    }
};

// Create new customer
exports.createCustomer = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] [CREATE_CUSTOMER] Request started`, {
        body: req.body,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        const { name, phone, email, address, birthday, customerType, notes } = req.body;

        // Validate required fields
        if (!name || !phone) {
            logger.warn(`[${requestId}] [CREATE_CUSTOMER] Missing required fields`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Name and phone are required fields'
                },
                requestId
            });
        }

        // Check for duplicate phone
        const existingPhone = await Customer.findByPhone(phone);
        if (existingPhone) {
            logger.warn(`[${requestId}] [CREATE_CUSTOMER] Phone number already exists: ${phone}`);
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: 'Phone number already exists'
                },
                requestId
            });
        }

        // Check for duplicate email if provided
        if (email) {
            const existingEmail = await Customer.findByEmail(email);
            if (existingEmail) {
                logger.warn(`[${requestId}] [CREATE_CUSTOMER] Email already exists: ${email}`);
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_ERROR',
                        message: 'Email address already exists'
                    },
                    requestId
                });
            }
        }

        logger.info(`[${requestId}] [CREATE_CUSTOMER] Creating customer:`, {
            name,
            phone,
            email: email || 'Not provided'
        });

        const customer = await Customer.create({
            name,
            phone,
            email,
            address,
            birthday,
            customerType: customerType || 'Regular',
            notes
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [CREATE_CUSTOMER] Customer created successfully`, {
            customerId: customer.id,
            customerName: customer.name,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            data: customer,
            message: 'Customer created successfully',
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [CREATE_CUSTOMER] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data provided',
                    details: error.errors?.map(e => e.message) || [error.message]
                },
                requestId
            });
        }

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to create customer at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while creating the customer'
            },
            requestId
        });
    }
};

// Update customer
exports.updateCustomer = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { id } = req.params;
    
    logger.info(`[${requestId}] [UPDATE_CUSTOMER] Request started`, {
        customerId: id,
        body: req.body,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Input validation
        if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
            logger.warn(`[${requestId}] [UPDATE_CUSTOMER] Invalid customer ID: ${id}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Customer ID must be a positive integer'
                },
                requestId
            });
        }

        const customerId = parseInt(id);
        const { name, phone, email, address, birthday, customerType, notes } = req.body;

        // Find customer
        const customer = await Customer.findOne({
            where: { id: customerId, isActive: true }
        });

        if (!customer) {
            logger.warn(`[${requestId}] [UPDATE_CUSTOMER] Customer not found: ${customerId}`);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `No customer found with ID: ${customerId}`
                },
                requestId
            });
        }

        // Check for duplicate phone if phone is being updated
        if (phone && phone !== customer.phone) {
            const existingPhone = await Customer.findByPhone(phone);
            if (existingPhone && existingPhone.id !== customerId) {
                logger.warn(`[${requestId}] [UPDATE_CUSTOMER] Phone number already exists: ${phone}`);
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_ERROR',
                        message: 'Phone number already exists'
                    },
                    requestId
                });
            }
        }

        // Check for duplicate email if email is being updated
        if (email && email !== customer.email) {
            const existingEmail = await Customer.findByEmail(email);
            if (existingEmail && existingEmail.id !== customerId) {
                logger.warn(`[${requestId}] [UPDATE_CUSTOMER] Email already exists: ${email}`);
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_ERROR',
                        message: 'Email address already exists'
                    },
                    requestId
                });
            }
        }

        logger.info(`[${requestId}] [UPDATE_CUSTOMER] Updating customer: ${customerId}`);

        // Update customer
        await customer.update({
            name: name || customer.name,
            phone: phone || customer.phone,
            email: email !== undefined ? email : customer.email,
            address: address !== undefined ? address : customer.address,
            birthday: birthday !== undefined ? birthday : customer.birthday,
            customerType: customerType || customer.customerType,
            notes: notes !== undefined ? notes : customer.notes
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [UPDATE_CUSTOMER] Customer updated successfully`, {
            customerId,
            customerName: customer.name,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: customer,
            message: 'Customer updated successfully',
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [UPDATE_CUSTOMER] Error occurred:`, {
            customerId: id,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data provided',
                    details: error.errors?.map(e => e.message) || [error.message]
                },
                requestId
            });
        }

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to update customer at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while updating the customer'
            },
            requestId
        });
    }
};

// Soft delete customer
exports.deleteCustomer = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { id } = req.params;
    
    logger.info(`[${requestId}] [DELETE_CUSTOMER] Request started`, {
        customerId: id,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Input validation
        if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
            logger.warn(`[${requestId}] [DELETE_CUSTOMER] Invalid customer ID: ${id}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Customer ID must be a positive integer'
                },
                requestId
            });
        }

        const customerId = parseInt(id);

        // Find customer
        const customer = await Customer.findOne({
            where: { id: customerId, isActive: true }
        });

        if (!customer) {
            logger.warn(`[${requestId}] [DELETE_CUSTOMER] Customer not found: ${customerId}`);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `No customer found with ID: ${customerId}`
                },
                requestId
            });
        }

        logger.info(`[${requestId}] [DELETE_CUSTOMER] Soft deleting customer: ${customerId}`);

        // Soft delete by setting isActive to false
        await customer.update({ isActive: false });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [DELETE_CUSTOMER] Customer deleted successfully`, {
            customerId,
            customerName: customer.name,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Customer deleted successfully',
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [DELETE_CUSTOMER] Error occurred:`, {
            customerId: id,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to delete customer at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while deleting the customer'
            },
            requestId
        });
    }
};

// ==================== PURCHASE HISTORY ====================

// Get customer purchase history
exports.getCustomerPurchaseHistory = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { customerId } = req.params;
    
    logger.info(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Request started`, {
        customerId,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Input validation
        if (!customerId || isNaN(parseInt(customerId)) || parseInt(customerId) <= 0) {
            logger.warn(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Invalid customer ID: ${customerId}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Customer ID must be a positive integer'
                },
                requestId
            });
        }

        const id = parseInt(customerId);
        const { page = 1, limit = 10 } = req.query;

        // Validate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Page must be a positive integer'
                },
                requestId
            });
        }
        
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Limit must be between 1 and 50'
                },
                requestId
            });
        }

        const offset = (pageNum - 1) * limitNum;

        // Check if customer exists
        const customer = await Customer.findOne({
            where: { id, isActive: true },
            attributes: ['id', 'name', 'phone', 'email', 'customerType']
        });

        if (!customer) {
            logger.warn(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Customer not found: ${id}`);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `No customer found with ID: ${id}`
                },
                requestId
            });
        }

        logger.info(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Fetching purchases for customer: ${id}`);

        // Get purchase history with items
        const { count, rows: purchases } = await Purchase.findAndCountAll({
            where: { customer_id: id },
            include: [{
                model: PurchaseItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category', 'brand']
                }, {
                    model: ProductVariant,
                    as: 'variant',
                    attributes: ['id', 'sku', 'color', 'size']
                }]
            }],
            order: [['purchase_date', 'DESC']],
            limit: limitNum,
            offset: parseInt(offset)
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Purchase history retrieved successfully`, {
            customerId: id,
            customerName: customer.name,
            purchasesFound: count,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                customer,
                purchases,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(count / limitNum),
                    totalItems: count,
                    itemsPerPage: limitNum
                }
            },
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [GET_CUSTOMER_PURCHASE_HISTORY] Error occurred:`, {
            customerId,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to retrieve purchase history at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while retrieving purchase history'
            },
            requestId
        });
    }
};

// ==================== ANALYTICS & REPORTS ====================

// Get customer statistics
exports.getCustomerStats = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] [GET_CUSTOMER_STATS] Request started`, {
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        logger.info(`[${requestId}] [GET_CUSTOMER_STATS] Fetching customer statistics`);

        // Get customer count by type
        const customerStats = await Customer.getCustomerStats();

        // Get total customers
        const totalCustomers = await Customer.count({
            where: { isActive: true }
        });

        // Get recent customers (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentCustomers = await Customer.count({
            where: {
                isActive: true,
                createdAt: {
                    [Op.gte]: thirtyDaysAgo
                }
            }
        });

        // Get top customers by total spent
        const topCustomers = await Customer.findAll({
            where: { isActive: true },
            attributes: ['id', 'name', 'phone', 'customerType', 'totalSpent', 'totalPurchases'],
            order: [['totalSpent', 'DESC']],
            limit: 10
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [GET_CUSTOMER_STATS] Statistics retrieved successfully`, {
            totalCustomers,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                totalCustomers,
                recentCustomers,
                customerStats,
                topCustomers
            },
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [GET_CUSTOMER_STATS] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to retrieve customer statistics at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while retrieving customer statistics'
            },
            requestId
        });
    }
};

// ==================== EXPORT FUNCTIONALITY ====================

// Export customers to CSV
exports.exportCustomersToCSV = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] [EXPORT_CUSTOMERS_CSV] Request started`, {
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        logger.info(`[${requestId}] [EXPORT_CUSTOMERS_CSV] Fetching customers for export`);

        const customers = await Customer.findAll({
            where: { isActive: true },
            attributes: [
                'id', 'name', 'phone', 'email', 'address', 'birthday', 
                'customerType', 'notes', 'totalPurchases', 'totalSpent', 
                'lastPurchaseDate', 'createdAt', 'updatedAt'
            ],
            order: [['createdAt', 'DESC']]
        });

        // Create CSV content
        let csvContent = 'ID,Name,Phone,Email,Address,Birthday,Customer Type,Notes,Total Purchases,Total Spent,Last Purchase Date,Created At,Updated At\n';

        customers.forEach(customer => {
            csvContent += `"${customer.id}","${customer.name || ''}","${customer.phone || ''}","${customer.email || ''}","${customer.address || ''}","${customer.birthday || ''}","${customer.customerType || ''}","${customer.notes || ''}","${customer.totalPurchases || 0}","${customer.totalSpent || 0}","${customer.lastPurchaseDate || ''}","${customer.createdAt}","${customer.updatedAt}"\n`;
        });

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [EXPORT_CUSTOMERS_CSV] Export completed successfully`, {
            customersExported: customers.length,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
        res.send(csvContent);
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [EXPORT_CUSTOMERS_CSV] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Unable to export customers at this time'
                },
                requestId
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while exporting customers'
            },
            requestId
        });
    }
};

// ==================== UTILITY FUNCTIONS ====================

// Get customer types
exports.getCustomerTypes = async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] [GET_CUSTOMER_TYPES] Request started`, {
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        const customerTypes = ['Regular', 'VIP', 'Wholesale'];

        const responseTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] [GET_CUSTOMER_TYPES] Customer types retrieved successfully`, {
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: customerTypes,
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] [GET_CUSTOMER_TYPES] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while retrieving customer types'
            },
            requestId
        });
    }
};
