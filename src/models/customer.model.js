module.exports = (sequelize, DataTypes) => {
    const Customer = sequelize.define('Customer', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Customer name is required'
                },
                len: {
                    args: [1, 255],
                    msg: 'Customer name must be between 1 and 255 characters'
                }
            }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: {
                msg: 'Phone number already exists'
            },
            validate: {
                notEmpty: {
                    msg: 'Phone number is required'
                },
                is: {
                    args: /^\+?[\d\s\-\(\)]{10,}$/,
                    msg: 'Please enter a valid phone number'
                }
            }
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: {
                msg: 'Email address already exists'
            },
            validate: {
                isEmail: {
                    msg: 'Please enter a valid email address'
                }
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 1000],
                    msg: 'Address cannot exceed 1000 characters'
                }
            }
        },
        birthday: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            validate: {
                isDate: {
                    msg: 'Please enter a valid date'
                },
                isPast(value) {
                    if (value && new Date(value) >= new Date()) {
                        throw new Error('Birthday must be in the past');
                    }
                }
            }
        },
        customerType: {
            type: DataTypes.ENUM('Regular', 'VIP', 'Wholesale'),
            allowNull: true,
            defaultValue: 'Regular',
            validate: {
                isIn: {
                    args: [['Regular', 'VIP', 'Wholesale']],
                    msg: 'Customer type must be Regular, VIP, or Wholesale'
                }
            }
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 2000],
                    msg: 'Notes cannot exceed 2000 characters'
                }
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: {
                isBoolean: {
                    msg: 'isActive must be a boolean value'
                }
            }
        },
        totalPurchases: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: {
                    args: [0],
                    msg: 'Total purchases cannot be negative'
                }
            }
        },
        totalSpent: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'Total spent cannot be negative'
                }
            }
        },
        lastPurchaseDate: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'customers',
        timestamps: true,
        paranoid: false, // We'll use isActive for soft delete
        indexes: [
            {
                unique: true,
                fields: ['phone'],
                where: {
                    isActive: true
                }
            },
            {
                unique: true,
                fields: ['email'],
                where: {
                    isActive: true
                }
            },
            {
                fields: ['customerType']
            },
            {
                fields: ['isActive']
            },
            {
                fields: ['name']
            }
        ],
        hooks: {
            beforeCreate: (customer) => {
                // Sanitize phone number
                if (customer.phone) {
                    customer.phone = customer.phone.replace(/\s+/g, '').trim();
                }
                
                // Sanitize email
                if (customer.email) {
                    customer.email = customer.email.toLowerCase().trim();
                }
                
                // Sanitize name
                if (customer.name) {
                    customer.name = customer.name.trim();
                }
            },
            beforeUpdate: (customer) => {
                // Sanitize phone number
                if (customer.changed('phone') && customer.phone) {
                    customer.phone = customer.phone.replace(/\s+/g, '').trim();
                }
                
                // Sanitize email
                if (customer.changed('email') && customer.email) {
                    customer.email = customer.email.toLowerCase().trim();
                }
                
                // Sanitize name
                if (customer.changed('name') && customer.name) {
                    customer.name = customer.name.trim();
                }
            }
        }
    });

    // Instance methods
    Customer.prototype.toJSON = function() {
        const values = Object.assign({}, this.get());
        
        // Format dates for JSON response
        if (values.birthday) {
            values.birthday = values.birthday.toISOString().split('T')[0];
        }
        if (values.lastPurchaseDate) {
            values.lastPurchaseDate = values.lastPurchaseDate.toISOString();
        }
        
        return values;
    };

    // Class methods
    Customer.findByPhone = function(phone) {
        return this.findOne({
            where: {
                phone: phone.replace(/\s+/g, '').trim(),
                isActive: true
            }
        });
    };

    Customer.findByEmail = function(email) {
        return this.findOne({
            where: {
                email: email.toLowerCase().trim(),
                isActive: true
            }
        });
    };

    Customer.getActiveCustomers = function() {
        return this.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
    };

    Customer.getCustomerStats = function() {
        return this.findAll({
            attributes: [
                'customerType',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('totalSpent')), 'totalSpent'],
                [sequelize.fn('AVG', sequelize.col('totalSpent')), 'averageSpent']
            ],
            where: { isActive: true },
            group: ['customerType']
        });
    };

    return Customer;
};
