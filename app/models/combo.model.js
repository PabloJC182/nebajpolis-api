// Combo: N boletos + productos de dulceria a un precio especial
module.exports = (sequelize, Sequelize) => sequelize.define("combo", {
  name: { type: Sequelize.STRING, allowNull: false },
  description: { type: Sequelize.TEXT },
  imageUrl: { type: Sequelize.STRING(1000) },
  ticketQty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
  price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },   // precio total del combo
  validFrom: { type: Sequelize.DATE },
  validTo: { type: Sequelize.DATE },
  status: { type: Sequelize.BOOLEAN, defaultValue: true }
});
