// Cierre de caja: el cajero cuenta el dinero y el sistema compara contra lo esperado
module.exports = (sequelize, Sequelize) => sequelize.define("cashClose", {
  userId: { type: Sequelize.INTEGER, allowNull: false },
  sinceAt: { type: Sequelize.DATE, allowNull: false },
  closedAt: { type: Sequelize.DATE, allowNull: false },
  salesCount: { type: Sequelize.INTEGER, defaultValue: 0 },
  expectedCash: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  expectedPos: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  countedCash: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  countedPos: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  diffCash: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  diffPos: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
  note: { type: Sequelize.STRING(500) }
}, { updatedAt: false });
