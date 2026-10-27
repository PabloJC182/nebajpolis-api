module.exports = (sequelize, Sequelize) => {
  const SaleFoodItem = sequelize.define("saleFoodItem", {
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    unitPrice: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    // true = esta linea desconto existencias (solo entonces se devuelven al cancelar/reembolsar)
    stockApplied: { type: Sequelize.BOOLEAN, defaultValue: false }
  });
  return SaleFoodItem;
};