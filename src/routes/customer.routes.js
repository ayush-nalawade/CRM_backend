const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, customerController.createCustomer);
router.get('/', protect, customerController.getCustomers);

module.exports = router;
