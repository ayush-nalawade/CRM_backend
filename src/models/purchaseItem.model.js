module.exports = (sequelize, DataTypes) => {
    const PurchaseItem = sequelize.define('PurchaseItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        purchase_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'purchases',
                key: 'id'
            },
            onDelete: 'CASCADE',
            validate: {
                notNull: {
                    msg: 'Purchase ID is required'
                }
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            },
            validate: {
                notNull: {
                    msg: 'Product ID is required'
                }
            }
        },
        product_variant_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'product_variants',
                key: 'id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [1],
                    msg: 'Quantity must be at least 1'
                },
                max: {
                    args: [999999],
                    msg: 'Quantity cannot exceed 999,999'
                }
            }
        },
        unit_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Unit price cannot be negative'
                }
            }
        },
        discount_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'Discount percentage cannot be negative'
                },
                max: {
                    args: [100],
                    msg: 'Discount percentage cannot exceed 100%'
                }
            }
        },
        discount_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'Discount amount cannot be negative'
                }
            }
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Subtotal cannot be negative'
                }
            }
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 500],
                    msg: 'Notes cannot exceed 500 characters'
                }
            }
        }
    }, {
        tableName: 'purchase_items',
        timestamps: true,
        indexes: [
            {
                fields: ['purchase_id']
            },
            {
                fields: ['product_id']
            },
            {
                fields: ['product_variant_id']
            }
        ],
        hooks: {
            beforeCreate: (item) => {
                // Calculate discount amount
                if (item.discount_percentage > 0) {
                    item.discount_amount = (parseFloat(item.unit_price) * parseFloat(item.quantity) * parseFloat(item.discount_percentage)) / 100;
                }
                
                // Calculate subtotal
                const totalBeforeDiscount = parseFloat(item.unit_price) * parseFloat(item.quantity);
                item.subtotal = totalBeforeDiscount - parseFloat(item.discount_amount || 0);
            },
            beforeUpdate: (item) => {
                // Recalculate if any pricing fields changed
                if (item.changed('unit_price') || 
                    item.changed('quantity') || 
                    item.changed('discount_percentage')) {
                    
                    // Recalculate discount amount
                    if (item.discount_percentage > 0) {
                        item.discount_amount = (parseFloat(item.unit_price) * parseFloat(item.quantity) * parseFloat(item.discount_percentage)) / 100;
                    } else {
                        item.discount_amount = 0;
                    }
                    
                    // Recalculate subtotal
                    const totalBeforeDiscount = parseFloat(item.unit_price) * parseFloat(item.quantity);
                    item.subtotal = totalBeforeDiscount - parseFloat(item.discount_amount || 0);
                }
            },
            afterCreate: async (item) => {
                // Update purchase total
                const purchase = await sequelize.models.Purchase.findByPk(item.purchase_id);
                if (purchase) {
                    const items = await sequelize.models.PurchaseItem.findAll({
                        where: { purchase_id: item.purchase_id }
                    });
                    
                    const totalAmount = items.reduce((sum, purchaseItem) => {
                        return sum + parseFloat(purchaseItem.subtotal);
                    }, 0);
                    
                    await purchase.update({
                        total_amount: totalAmount,
                        final_amount: totalAmount + parseFloat(purchase.tax_amount || 0) - parseFloat(purchase.discount_amount || 0)
                    });
                }
            },
            afterUpdate: async (item) => {
                // Update purchase total if subtotal changed
                if (item.changed('subtotal')) {
                    const purchase = await sequelize.models.Purchase.findByPk(item.purchase_id);
                    if (purchase) {
                        const items = await sequelize.models.PurchaseItem.findAll({
                            where: { purchase_id: item.purchase_id }
                        });
                        
                        const totalAmount = items.reduce((sum, purchaseItem) => {
                            return sum + parseFloat(purchaseItem.subtotal);
                        }, 0);
                        
                        await purchase.update({
                            total_amount: totalAmount,
                            final_amount: totalAmount + parseFloat(purchase.tax_amount || 0) - parseFloat(purchase.discount_amount || 0)
                        });
                    }
                }
            },
            afterDestroy: async (item) => {
                // Update purchase total after item deletion
                const purchase = await sequelize.models.Purchase.findByPk(item.purchase_id);
                if (purchase) {
                    const items = await sequelize.models.PurchaseItem.findAll({
                        where: { purchase_id: item.purchase_id }
                    });
                    
                    const totalAmount = items.reduce((sum, purchaseItem) => {
                        return sum + parseFloat(purchaseItem.subtotal);
                    }, 0);
                    
                    await purchase.update({
                        total_amount: totalAmount,
                        final_amount: totalAmount + parseFloat(purchase.tax_amount || 0) - parseFloat(purchase.discount_amount || 0)
                    });
                }
            }
        }
    });

    // Instance methods
    PurchaseItem.prototype.toJSON = function() {
        const values = Object.assign({}, this.get());
        return values;
    };

    return PurchaseItem;
}; 