const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { protect } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// ==================== CRUD OPERATIONS ====================

// Get all customers with search, filtering, and pagination
router.get('/', protect, asyncHandler(customerController.getAllCustomers));

// Get customer by ID
router.get('/:id', protect, asyncHandler(customerController.getCustomerById));

// Create new customer
router.post('/', protect, asyncHandler(customerController.createCustomer));

// Update customer
router.put('/:id', protect, asyncHandler(customerController.updateCustomer));

// Soft delete customer
router.delete('/:id', protect, asyncHandler(customerController.deleteCustomer));

// ==================== PURCHASE HISTORY ====================

// Get customer purchase history
router.get('/:customerId/purchases', protect, asyncHandler(customerController.getCustomerPurchaseHistory));

// ==================== ANALYTICS & REPORTS ====================

// Get customer statistics for dashboard
router.get('/stats/overview', protect, asyncHandler(customerController.getCustomerStats));

// Get customer types
router.get('/types/list', protect, asyncHandler(customerController.getCustomerTypes));

// ==================== EXPORT FUNCTIONALITY ====================

// Export customers to CSV
router.get('/export/csv', protect, asyncHandler(customerController.exportCustomersToCSV));

module.exports = router;
