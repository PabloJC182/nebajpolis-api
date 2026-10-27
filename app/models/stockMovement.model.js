// Kardex de dulceria: cada cambio de existencias queda registrado
module.exports = (sequelize, Sequelize) => sequelize.define("stockMovement", {
  foodItemId: { type: Sequelize.INTEGER, allowNull: false },
  delta: { type: Sequelize.INTEGER, allowNull: false },
  stockAfter: { type: Sequelize.INTEGER, allowNull: false },
  reason: { type: Sequelize.STRING, allowNull: false },   // venta | devolucion | reposicion | merma | conteo
  saleId: { type: Sequelize.INTEGER },
  userId: { type: Sequelize.INTEGER },
  note: { type: Sequelize.STRING }
}, { updatedAt: false });
