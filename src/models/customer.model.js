module.exports = (sequelize, DataTypes) => {

  const Customer = sequelize.define('Customer', {
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    birthday: { type: DataTypes.DATEONLY },
    customerType: { type: DataTypes.ENUM('Walk-in', 'Regular', 'VIP'), defaultValue: 'Walk-in' },
    notes: { type: DataTypes.TEXT }
  });
  
  return Customer;
};
