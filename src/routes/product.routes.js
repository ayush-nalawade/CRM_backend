const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');

// ==================== CRUD OPERATIONS ====================

// Get all products with pagination, search, and filtering
router.get('/', protect, productController.getAllProducts);

// Get a single product by ID
router.get('/:id', protect, productController.getProductById);

// Create a new product
router.post('/', protect, productController.createProduct);

// Update a product
router.put('/:id', protect, productController.updateProduct);

// Delete a product
router.delete('/:id', protect, productController.deleteProduct);

// ==================== PRODUCT VARIANTS ====================

// Add variant to existing product
router.post('/:productId/variants', protect, productController.addVariant);

// Update variant
router.put('/variants/:variantId', protect, productController.updateVariant);

// Delete variant
router.delete('/variants/:variantId', protect, productController.deleteVariant);

// ==================== ANALYTICS & REPORTS ====================

// Get product statistics
router.get('/stats/overview', protect, productController.getProductStats);

// Get products by category
router.get('/category/:category', protect, productController.getProductsByCategory);

// Get unique categories
router.get('/categories/list', protect, productController.getCategories);

// Get unique brands
router.get('/brands/list', protect, productController.getBrands);

// ==================== CSV OPERATIONS ====================

// Import products from CSV
router.post('/import/csv', protect, productController.upload.single('csvFile'), productController.importProductsFromCSV);

// Export products to CSV
router.get('/export/csv', protect, productController.exportProductsToCSV);

// ==================== BULK OPERATIONS ====================

// Bulk update stock
router.put('/bulk/stock', protect, productController.bulkUpdateStock);

module.exports = router; 