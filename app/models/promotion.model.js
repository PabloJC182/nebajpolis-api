// app/models/promotion.model.js
module.exports = (sequelize, Sequelize) => {
  const Promotion = sequelize.define("promotion", {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    discountPercentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false
    },
    validFrom: {
      type: Sequelize.DATE
    },
    validTo: {
      type: Sequelize.DATE
    },
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Promotion;
};
