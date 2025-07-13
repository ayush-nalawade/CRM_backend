const db = require('../models');
const Customer = db.Customer;

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [['createdAt', 'DESC']] });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
