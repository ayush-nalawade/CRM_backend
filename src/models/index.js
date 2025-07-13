const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const db = {};

db.Sequelize = sequelize;
db.User = require('./user.model')(sequelize, DataTypes);
db.Customer = require('./customer.model')(sequelize, DataTypes);

// Add Product, Purchase, Lead models similarly

module.exports = db;
