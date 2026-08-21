// app/models/ticket.model.js
module.exports = (sequelize, Sequelize) => {
  const Ticket = sequelize.define("ticket", {
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    indexes: [
      // Un mismo asiento no puede venderse dos veces para la misma funcion.
      // Esto refuerza a nivel de base de datos el control de concurrencia
      // que ademas se maneja con una transaccion en el controlador de venta.
      { unique: true, fields: ["showId", "seatId"] }
    ]
  });
  return Ticket;
};
