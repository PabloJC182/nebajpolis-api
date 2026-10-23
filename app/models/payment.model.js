
module.exports = (sequelize, Sequelize) => {
  const Payment = sequelize.define("payment", {
    
    method: {
      type: Sequelize.STRING,
      defaultValue: "card"
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending"
    },
    
    stripePaymentIntentId: {
      type: Sequelize.STRING
    }
  });
  return Payment;
};