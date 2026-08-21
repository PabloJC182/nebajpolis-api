// app/models/show.model.js
module.exports = (sequelize, Sequelize) => {
  const Show = sequelize.define("show", {
    showDatetime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    basePrice: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    // Idioma/formato de la proyeccion, ej. "subtitulada", "doblada"
    format: {
      type: Sequelize.STRING,
      defaultValue: "subtitulada"
    },
    // Permite cancelar una funcion sin borrar los boletos ya vendidos
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Show;
};
