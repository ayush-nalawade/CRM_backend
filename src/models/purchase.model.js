module.exports = (sequelize, DataTypes) => {
    const Purchase = sequelize.define('Purchase', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'customers',
                key: 'id'
            },
            onDelete: 'CASCADE',
            validate: {
                notNull: {
                    msg: 'Customer ID is required'
                }
            }
        },
        purchase_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Purchase number is required'
                }
            }
        },
        total_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Total amount cannot be negative'
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
        tax_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'Tax amount cannot be negative'
                }
            }
        },
        final_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Final amount cannot be negative'
                }
            }
        },
        payment_method: {
            type: DataTypes.ENUM('Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet'),
            allowNull: false,
            defaultValue: 'Cash',
            validate: {
                isIn: {
                    args: [['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet']],
                    msg: 'Invalid payment method'
                }
            }
        },
        payment_status: {
            type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: {
                    args: [['Pending', 'Paid', 'Failed', 'Refunded']],
                    msg: 'Invalid payment status'
                }
            }
        },
        purchase_status: {
            type: DataTypes.ENUM('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: {
                    args: [['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']],
                    msg: 'Invalid purchase status'
                }
            }
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 1000],
                    msg: 'Notes cannot exceed 1000 characters'
                }
            }
        },
        purchase_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            validate: {
                isDate: {
                    msg: 'Invalid purchase date'
                }
            }
        }
    }, {
        tableName: 'purchases',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['purchase_number']
            },
            {
                fields: ['customer_id']
            },
            {
                fields: ['purchase_date']
            },
            {
                fields: ['payment_status']
            },
            {
                fields: ['purchase_status']
            }
        ],
        hooks: {
            beforeCreate: (purchase) => {
                // Generate purchase number if not provided
                if (!purchase.purchase_number) {
                    const timestamp = Date.now();
                    const random = Math.floor(Math.random() * 1000);
                    purchase.purchase_number = `PUR-${timestamp}-${random}`;
                }
                
                // Calculate final amount
                if (purchase.total_amount !== undefined) {
                    purchase.final_amount = parseFloat(purchase.total_amount) + 
                                          parseFloat(purchase.tax_amount || 0) - 
                                          parseFloat(purchase.discount_amount || 0);
                }
            },
            beforeUpdate: (purchase) => {
                // Recalculate final amount if any amount fields changed
                if (purchase.changed('total_amount') || 
                    purchase.changed('tax_amount') || 
                    purchase.changed('discount_amount')) {
                    purchase.final_amount = parseFloat(purchase.total_amount || 0) + 
                                          parseFloat(purchase.tax_amount || 0) - 
                                          parseFloat(purchase.discount_amount || 0);
                }
            },
            afterCreate: async (purchase) => {
                // Update customer stats
                const customer = await sequelize.models.Customer.findByPk(purchase.customer_id);
                if (customer) {
                    await customer.update({
                        totalPurchases: customer.totalPurchases + 1,
                        totalSpent: parseFloat(customer.totalSpent) + parseFloat(purchase.final_amount),
                        lastPurchaseDate: purchase.purchase_date
                    });
                }
            },
            afterUpdate: async (purchase) => {
                // Update customer stats if amount changed
                if (purchase.changed('final_amount')) {
                    const customer = await sequelize.models.Customer.findByPk(purchase.customer_id);
                    if (customer) {
                        const previousAmount = parseFloat(purchase.previous('final_amount') || 0);
                        const newAmount = parseFloat(purchase.final_amount);
                        const difference = newAmount - previousAmount;
                        
                        await customer.update({
                            totalSpent: parseFloat(customer.totalSpent) + difference
                        });
                    }
                }
            }
        }
    });

    // Instance methods
    Purchase.prototype.toJSON = function() {
        const values = Object.assign({}, this.get());
        
        // Format dates for JSON response
        if (values.purchase_date) {
            values.purchase_date = values.purchase_date.toISOString();
        }
        
        return values;
    };

    // Class methods
    Purchase.getCustomerPurchases = function(customerId, options = {}) {
        const { limit = 10, offset = 0, orderBy = 'purchase_date', orderDirection = 'DESC' } = options;
        
        return this.findAndCountAll({
            where: { customer_id: customerId },
            include: [{
                model: sequelize.models.PurchaseItem,
                as: 'items',
                include: [{
                    model: sequelize.models.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category', 'brand']
                }]
            }],
            order: [[orderBy, orderDirection]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    };

    Purchase.getPurchaseStats = function(customerId) {
        return this.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalPurchases'],
                [sequelize.fn('SUM', sequelize.col('final_amount')), 'totalSpent'],
                [sequelize.fn('AVG', sequelize.col('final_amount')), 'averagePurchase'],
                [sequelize.fn('MAX', sequelize.col('purchase_date')), 'lastPurchaseDate']
            ],
            where: { customer_id: customerId }
        });
    };

    return Purchase;
}; 