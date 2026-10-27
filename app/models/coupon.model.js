module.exports = (sequelize, Sequelize) => sequelize.define("coupon", {
  code: { type: Sequelize.STRING, allowNull: false, unique: true },
  description: { type: Sequelize.STRING },
  type: { type: Sequelize.STRING, defaultValue: "percent" },     // percent | fixed
  value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
  appliesTo: { type: Sequelize.STRING, defaultValue: "all" },    // all | tickets | food
  minAmount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  maxUses: { type: Sequelize.INTEGER },                          // null = ilimitado
  perUserLimit: { type: Sequelize.INTEGER, defaultValue: 1 },    // null = ilimitado
  validFrom: { type: Sequelize.DATE },
  validTo: { type: Sequelize.DATE },
  status: { type: Sequelize.BOOLEAN, defaultValue: true }
});
