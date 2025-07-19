module.exports = (sequelize, DataTypes) => {

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    brand: {
        type: DataTypes.STRING
    },
    image_url: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'products',
    timestamps: true
});

    return Product;
}