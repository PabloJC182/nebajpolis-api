module.exports = (sequelize, Sequelize) => {
  const FoodItem = sequelize.define("foodItem", {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    category: {
      type: Sequelize.STRING,
      defaultValue: "Otros"
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    imageUrl: {
      type: Sequelize.STRING
    },
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    // Existencias: null = sin control de inventario. Solo cambia por /inventario o por ventas (queda en el kardex).
    stock: { type: Sequelize.INTEGER },
    stockMin: { type: Sequelize.INTEGER, defaultValue: 5 }
  });
  return FoodItem;
};