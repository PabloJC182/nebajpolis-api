module.exports = (sequelize, Sequelize) => sequelize.define("comboItem", {
  quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }
});
