const db = require('../models');
const Product = db.Product;
const ProductVariant = db.ProductVariant;
const { Op, DatabaseError } = require('sequelize');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Custom error classes for better error handling
class ProductError extends Error {
    constructor(message, statusCode = 500, code = 'PRODUCT_ERROR') {
        super(message);
        this.name = 'ProductError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

// Configure multer for file uploads with enhanced error handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sanitize filename to prevent security issues
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        cb(null, `${timestamp}-${sanitizedName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        console.log(`[MULTER] Processing file: ${file.originalname}, mimetype: ${file.mimetype}`);
        
        // Check file extension and mimetype
        const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
        const allowedExtensions = ['.csv'];
        
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
            console.log(`[MULTER] File validation passed for: ${file.originalname}`);
            cb(null, true);
        } else {
            console.error(`[MULTER] File validation failed for: ${file.originalname}`);
            cb(new ValidationError('Only CSV files are allowed. Please upload a valid CSV file.'), false);
        }
    }
});

// ==================== VALIDATION UTILITIES ====================

// Input validation utilities
const validatePaginationParams = (page, limit) => {
    const errors = [];
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('Limit must be between 1 and 100');
    }
    
    return { pageNum, limitNum, errors };
};

const validatePriceRange = (minPrice, maxPrice) => {
    const errors = [];
    
    if (minPrice !== undefined) {
        const min = parseFloat(minPrice);
        if (isNaN(min) || min < 0) {
            errors.push('Minimum price must be a positive number');
        }
    }
    
    if (maxPrice !== undefined) {
        const max = parseFloat(maxPrice);
        if (isNaN(max) || max < 0) {
            errors.push('Maximum price must be a positive number');
        }
    }
    
    if (minPrice && maxPrice) {
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        if (min > max) {
            errors.push('Minimum price cannot be greater than maximum price');
        }
    }
    
    return { minPrice: parseFloat(minPrice), maxPrice: parseFloat(maxPrice), errors };
};

const validateSortParams = (sortBy, sortOrder) => {
    const allowedSortFields = ['id', 'name', 'category', 'base_price', 'brand', 'createdAt', 'updatedAt'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const errors = [];
    
    if (!allowedSortFields.includes(sortBy)) {
        errors.push(`Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`);
    }
    
    if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
        errors.push('Sort order must be ASC or DESC');
    }
    
    return { sortBy, sortOrder: sortOrder.toUpperCase(), errors };
};

// ==================== CRUD OPERATIONS ====================

// Get all products with pagination, search, and filtering
exports.getAllProducts = async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] [GET_PRODUCTS] Request started`, {
        query: req.query,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        const {
            page = 1,
            limit = 10,
            search,
            category,
            brand,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        // Input validation
        const paginationValidation = validatePaginationParams(page, limit);
        const priceValidation = validatePriceRange(minPrice, maxPrice);
        const sortValidation = validateSortParams(sortBy, sortOrder);
        
        const validationErrors = [
            ...paginationValidation.errors,
            ...priceValidation.errors,
            ...sortValidation.errors
        ];
        
        if (validationErrors.length > 0) {
            console.warn(`[${requestId}] [GET_PRODUCTS] Validation failed:`, validationErrors);
            return res.status(400).json({
                error: 'Validation failed',
                details: validationErrors,
                requestId
            });
        }

        const offset = (paginationValidation.pageNum - 1) * paginationValidation.limitNum;
        const whereClause = {};

        // Search functionality with input sanitization
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const sanitizedSearch = search.trim().replace(/[%_]/g, '\\$&'); // Escape special characters
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { description: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { brand: { [Op.iLike]: `%${sanitizedSearch}%` } }
            ];
            console.log(`[${requestId}] [GET_PRODUCTS] Search applied: "${sanitizedSearch}"`);
        }

        // Filter by category with validation
        if (category && typeof category === 'string' && category.trim().length > 0) {
            whereClause.category = category.trim();
        }

        // Filter by brand with validation
        if (brand && typeof brand === 'string' && brand.trim().length > 0) {
            whereClause.brand = brand.trim();
        }

        // Filter by price range
        if (priceValidation.minPrice !== undefined || priceValidation.maxPrice !== undefined) {
            whereClause.base_price = {};
            if (priceValidation.minPrice !== undefined) {
                whereClause.base_price[Op.gte] = priceValidation.minPrice;
            }
            if (priceValidation.maxPrice !== undefined) {
                whereClause.base_price[Op.lte] = priceValidation.maxPrice;
            }
        }

        console.log(`[${requestId}] [GET_PRODUCTS] Query parameters:`, {
            whereClause,
            sortBy: sortValidation.sortBy,
            sortOrder: sortValidation.sortOrder,
            limit: paginationValidation.limitNum,
            offset
        });

        const { count, rows: products } = await Product.findAndCountAll({
            where: whereClause,
            include: [{
                model: ProductVariant,
                as: 'variants',
                attributes: ['id', 'sku', 'color', 'size', 'price', 'stock']
            }],
            order: [[sortValidation.sortBy, sortValidation.sortOrder]],
            limit: paginationValidation.limitNum,
            offset: parseInt(offset)
        });

        const responseTime = Date.now() - startTime;
        
        console.log(`[${requestId}] [GET_PRODUCTS] Request completed successfully`, {
            productsFound: count,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: paginationValidation.pageNum,
                    totalPages: Math.ceil(count / paginationValidation.limitNum),
                    totalItems: count,
                    itemsPerPage: paginationValidation.limitNum
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
        
        console.error(`[${requestId}] [GET_PRODUCTS] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        // Handle specific database errors
        if (error instanceof DatabaseError) {
            return res.status(500).json({
                error: 'Database operation failed',
                message: 'Unable to retrieve products at this time',
                requestId
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while retrieving products',
            requestId
        });
    }
};

// Get a single product by ID with variants
exports.getProductById = async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { id } = req.params;
    
    console.log(`[${requestId}] [GET_PRODUCT_BY_ID] Request started`, {
        productId: id,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Input validation
        if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
            console.warn(`[${requestId}] [GET_PRODUCT_BY_ID] Invalid product ID: ${id}`);
            return res.status(400).json({
                error: 'Invalid product ID',
                message: 'Product ID must be a positive integer',
                requestId
            });
        }

        const productId = parseInt(id);
        
        console.log(`[${requestId}] [GET_PRODUCT_BY_ID] Fetching product with ID: ${productId}`);

        const product = await Product.findByPk(productId, {
            include: [{
                model: ProductVariant,
                as: 'variants',
                attributes: ['id', 'sku', 'color', 'size', 'price', 'discount', 'stock', 'image_url', 'createdAt', 'updatedAt']
            }]
        });

        if (!product) {
            console.warn(`[${requestId}] [GET_PRODUCT_BY_ID] Product not found: ${productId}`);
            return res.status(404).json({
                error: 'Product not found',
                message: `No product found with ID: ${productId}`,
                requestId
            });
        }

        const responseTime = Date.now() - startTime;
        
        console.log(`[${requestId}] [GET_PRODUCT_BY_ID] Product retrieved successfully`, {
            productId,
            productName: product.name,
            variantsCount: product.variants?.length || 0,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: product,
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`[${requestId}] [GET_PRODUCT_BY_ID] Error occurred:`, {
            productId: id,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        // Handle specific database errors
        if (error instanceof DatabaseError) {
            return res.status(500).json({
                error: 'Database operation failed',
                message: 'Unable to retrieve product at this time',
                requestId
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while retrieving the product',
            requestId
        });
    }
};

// Product validation utilities
const validateProductData = (data) => {
    const errors = [];
    const sanitizedData = {};

    // Validate and sanitize name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Product name is required and must be a non-empty string');
    } else if (data.name.trim().length > 255) {
        errors.push('Product name cannot exceed 255 characters');
    } else {
        sanitizedData.name = data.name.trim();
    }

    // Validate and sanitize category
    if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
        errors.push('Product category is required and must be a non-empty string');
    } else if (data.category.trim().length > 100) {
        errors.push('Product category cannot exceed 100 characters');
    } else {
        sanitizedData.category = data.category.trim();
    }

    // Validate and sanitize base_price
    if (!data.base_price || isNaN(parseFloat(data.base_price))) {
        errors.push('Base price is required and must be a valid number');
    } else {
        const price = parseFloat(data.base_price);
        if (price < 0) {
            errors.push('Base price cannot be negative');
        } else if (price > 999999.99) {
            errors.push('Base price cannot exceed 999,999.99');
        } else {
            sanitizedData.base_price = price;
        }
    }

    // Validate description (optional)
    if (data.description !== undefined) {
        if (typeof data.description !== 'string') {
            errors.push('Description must be a string');
        } else if (data.description.length > 1000) {
            errors.push('Description cannot exceed 1000 characters');
        } else {
            sanitizedData.description = data.description.trim() || null;
        }
    }

    // Validate brand (optional)
    if (data.brand !== undefined) {
        if (typeof data.brand !== 'string') {
            errors.push('Brand must be a string');
        } else if (data.brand.trim().length > 100) {
            errors.push('Brand cannot exceed 100 characters');
        } else {
            sanitizedData.brand = data.brand.trim() || null;
        }
    }

    // Validate image_url (optional)
    if (data.image_url !== undefined) {
        if (typeof data.image_url !== 'string') {
            errors.push('Image URL must be a string');
        } else {
            const url = data.image_url.trim();
            if (url && !isValidUrl(url)) {
                errors.push('Image URL must be a valid URL');
            } else {
                sanitizedData.image_url = url || null;
            }
        }
    }

    return { errors, sanitizedData };
};

const validateVariantData = (variants, basePrice) => {
    const errors = [];
    const sanitizedVariants = [];

    if (!Array.isArray(variants)) {
        errors.push('Variants must be an array');
        return { errors, sanitizedVariants };
    }

    for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const variantErrors = [];
        const sanitizedVariant = {};

        // Validate SKU
        if (!variant.sku || typeof variant.sku !== 'string' || variant.sku.trim().length === 0) {
            variantErrors.push('SKU is required and must be a non-empty string');
        } else if (variant.sku.trim().length > 50) {
            variantErrors.push('SKU cannot exceed 50 characters');
        } else {
            sanitizedVariant.sku = variant.sku.trim();
        }

        // Validate price
        if (variant.price !== undefined) {
            const price = parseFloat(variant.price);
            if (isNaN(price) || price < 0) {
                variantErrors.push('Price must be a valid positive number');
            } else if (price > 999999.99) {
                variantErrors.push('Price cannot exceed 999,999.99');
            } else {
                sanitizedVariant.price = price;
            }
        } else {
            sanitizedVariant.price = basePrice;
        }

        // Validate discount
        if (variant.discount !== undefined) {
            const discount = parseFloat(variant.discount);
            if (isNaN(discount) || discount < 0) {
                variantErrors.push('Discount must be a valid positive number');
            } else if (discount > 100) {
                variantErrors.push('Discount cannot exceed 100%');
            } else {
                sanitizedVariant.discount = discount;
            }
        } else {
            sanitizedVariant.discount = 0;
        }

        // Validate stock
        if (variant.stock !== undefined) {
            const stock = parseInt(variant.stock);
            if (isNaN(stock) || stock < 0) {
                variantErrors.push('Stock must be a valid non-negative integer');
            } else if (stock > 999999) {
                variantErrors.push('Stock cannot exceed 999,999');
            } else {
                sanitizedVariant.stock = stock;
            }
        } else {
            sanitizedVariant.stock = 0;
        }

        // Validate color (optional)
        if (variant.color !== undefined) {
            if (typeof variant.color !== 'string') {
                variantErrors.push('Color must be a string');
            } else if (variant.color.trim().length > 50) {
                variantErrors.push('Color cannot exceed 50 characters');
            } else {
                sanitizedVariant.color = variant.color.trim() || null;
            }
        }

        // Validate size (optional)
        if (variant.size !== undefined) {
            if (typeof variant.size !== 'string') {
                variantErrors.push('Size must be a string');
            } else if (variant.size.trim().length > 50) {
                variantErrors.push('Size cannot exceed 50 characters');
            } else {
                sanitizedVariant.size = variant.size.trim() || null;
            }
        }

        // Validate image_url (optional)
        if (variant.image_url !== undefined) {
            if (typeof variant.image_url !== 'string') {
                variantErrors.push('Variant image URL must be a string');
            } else {
                const url = variant.image_url.trim();
                if (url && !isValidUrl(url)) {
                    variantErrors.push('Variant image URL must be a valid URL');
                } else {
                    sanitizedVariant.image_url = url || null;
                }
            }
        }

        if (variantErrors.length > 0) {
            errors.push(`Variant ${i + 1}: ${variantErrors.join(', ')}`);
        } else {
            sanitizedVariants.push(sanitizedVariant);
        }
    }

    return { errors, sanitizedVariants };
};

// URL validation utility
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// Create a new product with optional variants
exports.createProduct = async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] [CREATE_PRODUCT] Request started`, {
        body: req.body,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    try {
        const { name, description, category, base_price, brand, image_url, variants } = req.body;

        // Validate product data
        const productValidation = validateProductData({ name, description, category, base_price, brand, image_url });
        
        if (productValidation.errors.length > 0) {
            console.warn(`[${requestId}] [CREATE_PRODUCT] Product validation failed:`, productValidation.errors);
            return res.status(400).json({
                error: 'Product validation failed',
                details: productValidation.errors,
                requestId
            });
        }

        // Validate variants if provided
        let variantValidation = { errors: [], sanitizedVariants: [] };
        if (variants && variants.length > 0) {
            variantValidation = validateVariantData(variants, productValidation.sanitizedData.base_price);
            
            if (variantValidation.errors.length > 0) {
                console.warn(`[${requestId}] [CREATE_PRODUCT] Variant validation failed:`, variantValidation.errors);
                return res.status(400).json({
                    error: 'Variant validation failed',
                    details: variantValidation.errors,
                    requestId
                });
            }
        }

        console.log(`[${requestId}] [CREATE_PRODUCT] Creating product:`, {
            name: productValidation.sanitizedData.name,
            category: productValidation.sanitizedData.category,
            variantsCount: variantValidation.sanitizedVariants.length
        });

        // Create product
        const product = await Product.create(productValidation.sanitizedData);

        // Create variants if provided
        if (variantValidation.sanitizedVariants.length > 0) {
            const productVariants = variantValidation.sanitizedVariants.map(variant => ({
                ...variant,
                product_id: product.id
            }));
            
            console.log(`[${requestId}] [CREATE_PRODUCT] Creating ${productVariants.length} variants`);
            await ProductVariant.bulkCreate(productVariants);
        }

        // Return the product with its variants
        const productWithVariants = await Product.findByPk(product.id, {
            include: [{
                model: ProductVariant,
                as: 'variants'
            }]
        });

        const responseTime = Date.now() - startTime;
        
        console.log(`[${requestId}] [CREATE_PRODUCT] Product created successfully`, {
            productId: product.id,
            productName: product.name,
            variantsCreated: variantValidation.sanitizedVariants.length,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            data: productWithVariants,
            meta: {
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`[${requestId}] [CREATE_PRODUCT] Error occurred:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        // Handle specific Sequelize errors
        if (error instanceof ValidationError) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Invalid data provided',
                details: error.errors?.map(e => e.message) || [error.message],
                requestId
            });
        }

        if (error instanceof DatabaseError) {
            return res.status(500).json({
                error: 'Database operation failed',
                message: 'Unable to create product at this time',
                requestId
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while creating the product',
            requestId
        });
    }
};

// Update a product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, base_price, brand, image_url } = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.update({
            name: name || product.name,
            description: description || product.description,
            category: category || product.category,
            base_price: base_price ? parseFloat(base_price) : product.base_price,
            brand: brand || product.brand,
            image_url: image_url || product.image_url
        });

        const updatedProduct = await Product.findByPk(id, {
            include: [{
                model: ProductVariant,
                as: 'variants'
            }]
        });

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a product (will also delete associated variants due to CASCADE)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.destroy();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== PRODUCT VARIANTS OPERATIONS ====================

// Add variant to existing product
exports.addVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const { sku, color, size, price, discount, stock, image_url } = req.body;

        // Check if product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Validate required fields
        if (!sku || !price) {
            return res.status(400).json({ 
                error: 'SKU and price are required fields' 
            });
        }

        // Check if SKU already exists
        const existingVariant = await ProductVariant.findOne({ where: { sku } });
        if (existingVariant) {
            return res.status(400).json({ error: 'SKU already exists' });
        }

        const variant = await ProductVariant.create({
            product_id: productId,
            sku,
            color,
            size,
            price: parseFloat(price),
            discount: parseFloat(discount) || 0,
            stock: parseInt(stock) || 0,
            image_url
        });

        res.status(201).json(variant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update variant
exports.updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const updateData = req.body;

        const variant = await ProductVariant.findByPk(variantId);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }

        await variant.update(updateData);
        res.json(variant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete variant
exports.deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;

        const variant = await ProductVariant.findByPk(variantId);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }

        await variant.destroy();
        res.json({ message: 'Variant deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== ANALYTICS & REPORTS ====================

// Get product statistics
exports.getProductStats = async (req, res) => {
    try {
        const totalProducts = await Product.count();
        const totalVariants = await ProductVariant.count();
        
        // Get category distribution
        const categoryStats = await Product.findAll({
            attributes: [
                'category',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: ['category']
        });

        // Get brand distribution
        const brandStats = await Product.findAll({
            attributes: [
                'brand',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            where: { brand: { [Op.ne]: null } },
            group: ['brand']
        });

        // Get low stock variants (less than 10 items)
        const lowStockVariants = await ProductVariant.count({
            where: { stock: { [Op.lt]: 10 } }
        });

        res.json({
            totalProducts,
            totalVariants,
            categoryStats,
            brandStats,
            lowStockVariants
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows: products } = await Product.findAndCountAll({
            where: { category },
            include: [{
                model: ProductVariant,
                as: 'variants'
            }],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            products,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== CSV IMPORT FUNCTIONALITY ====================

// Import products from CSV file
exports.importProductsFromCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }

        const results = [];
        const errors = [];
        let successCount = 0;
        let errorCount = 0;

        // Read and parse CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', async () => {
                try {
                    // Process each row
                    for (let i = 0; i < results.length; i++) {
                        const row = results[i];
                        
                        try {
                            // Validate required fields
                            if (!row.name || !row.category || !row.base_price) {
                                errors.push({
                                    row: i + 2, // +2 because CSV starts from row 2 and we're 0-indexed
                                    error: 'Missing required fields (name, category, base_price)'
                                });
                                errorCount++;
                                continue;
                            }

                            // Create product
                            const product = await Product.create({
                                name: row.name.trim(),
                                description: row.description || null,
                                category: row.category.trim(),
                                base_price: parseFloat(row.base_price),
                                brand: row.brand || null,
                                image_url: row.image_url || null
                            });

                            // Create variants if provided
                            if (row.sku && row.variant_price) {
                                await ProductVariant.create({
                                    product_id: product.id,
                                    sku: row.sku.trim(),
                                    color: row.color || null,
                                    size: row.size || null,
                                    price: parseFloat(row.variant_price),
                                    discount: parseFloat(row.discount) || 0,
                                    stock: parseInt(row.stock) || 0,
                                    image_url: row.variant_image_url || null
                                });
                            }

                            successCount++;
                        } catch (error) {
                            errors.push({
                                row: i + 2,
                                error: error.message
                            });
                            errorCount++;
                        }
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        message: 'CSV import completed',
                        summary: {
                            totalRows: results.length,
                            successCount,
                            errorCount
                        },
                        errors: errors.length > 0 ? errors : null
                    });
                } catch (error) {
                    // Clean up uploaded file on error
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    res.status(500).json({ error: error.message });
                }
            })
            .on('error', (error) => {
                // Clean up uploaded file on error
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(500).json({ error: 'Error reading CSV file' });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Export products to CSV
exports.exportProductsToCSV = async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [{
                model: ProductVariant,
                as: 'variants'
            }]
        });

        // Create CSV content
        let csvContent = 'Name,Description,Category,Base Price,Brand,Image URL,SKU,Color,Size,Variant Price,Discount,Stock,Variant Image URL\n';

        products.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    csvContent += `"${product.name}","${product.description || ''}","${product.category}","${product.base_price}","${product.brand || ''}","${product.image_url || ''}","${variant.sku}","${variant.color || ''}","${variant.size || ''}","${variant.price}","${variant.discount}","${variant.stock}","${variant.image_url || ''}"\n`;
                });
            } else {
                // Product without variants
                csvContent += `"${product.name}","${product.description || ''}","${product.category}","${product.base_price}","${product.brand || ''}","${product.image_url || ''}","","","","","","",""\n`;
            }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== UTILITY FUNCTIONS ====================

// Get unique categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Product.findAll({
            attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('category')), 'category']],
            raw: true
        });

        res.json(categories.map(cat => cat.category));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get unique brands
exports.getBrands = async (req, res) => {
    try {
        const brands = await Product.findAll({
            attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('brand')), 'brand']],
            where: { brand: { [Op.ne]: null } },
            raw: true
        });

        res.json(brands.map(brand => brand.brand));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bulk update product stock
exports.bulkUpdateStock = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { variantId, newStock }

        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Updates must be an array' });
        }

        const results = [];
        for (const update of updates) {
            try {
                const variant = await ProductVariant.findByPk(update.variantId);
                if (variant) {
                    await variant.update({ stock: parseInt(update.newStock) });
                    results.push({ variantId: update.variantId, success: true });
                } else {
                    results.push({ variantId: update.variantId, success: false, error: 'Variant not found' });
                }
            } catch (error) {
                results.push({ variantId: update.variantId, success: false, error: error.message });
            }
        }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.upload = upload; 