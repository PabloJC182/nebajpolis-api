
module.exports = (sequelize, Sequelize) => {
  const Sale = sequelize.define("sale", {
    saleDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    totalAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending"
    }
  });
  return Sale;
};
