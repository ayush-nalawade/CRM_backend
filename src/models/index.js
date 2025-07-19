const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const db = {};

db.Sequelize = sequelize;
db.User = require('./user.model')(sequelize, DataTypes);
db.Customer = require('./customer.model')(sequelize, DataTypes);
db.Product = require('./product.model')(sequelize, DataTypes);
db.ProductVariant = require('./productVariant.model')(sequelize, DataTypes);
db.Purchase = require('./purchase.model')(sequelize, DataTypes);
db.PurchaseItem = require('./purchaseItem.model')(sequelize, DataTypes);

// Product associations
db.Product.hasMany(db.ProductVariant, { foreignKey: 'product_id', as: 'variants' });
db.ProductVariant.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

// Customer associations
db.Customer.hasMany(db.Purchase, { foreignKey: 'customer_id', as: 'purchases' });
db.Purchase.belongsTo(db.Customer, { foreignKey: 'customer_id', as: 'customer' });

// Purchase associations
db.Purchase.hasMany(db.PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });
db.PurchaseItem.belongsTo(db.Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

// Product associations with PurchaseItem
db.Product.hasMany(db.PurchaseItem, { foreignKey: 'product_id', as: 'purchaseItems' });
db.PurchaseItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

// ProductVariant associations with PurchaseItem
db.ProductVariant.hasMany(db.PurchaseItem, { foreignKey: 'product_variant_id', as: 'purchaseItems' });
db.PurchaseItem.belongsTo(db.ProductVariant, { foreignKey: 'product_variant_id', as: 'variant' });

module.exports = db;
