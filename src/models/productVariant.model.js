module.exports = (sequelize, DataTypes) => {

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products', // Reference the table name
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    sku: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING
    },
    size: {
        type: DataTypes.STRING
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discount: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    image_url: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'product_variants',
    timestamps: true
});

// Remove the associations from here - they should be defined in index.js
// Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
// ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    return ProductVariant;
}