
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
    },
    // Dias de la semana de la FUNCION en que aplica: "2" (martes), "0,6" (fin de semana). Vacio = todos.
    validDays: {
      type: Sequelize.STRING
    }
  });
  return Promotion;
};
