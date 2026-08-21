// app/models/seat.model.js
module.exports = (sequelize, Sequelize) => {
  const Seat = sequelize.define("seat", {
    // Fila, ej. "A", "B"
    rowLabel: {
      type: Sequelize.STRING,
      allowNull: false
    },
    seatNumber: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    // Tipo de asiento, ej. "regular", "vip", "disabled"
    seatType: {
      type: Sequelize.STRING,
      defaultValue: "regular"
    }
  }, {
    indexes: [
      // Un asiento (fila+numero) no puede repetirse dentro de la misma sala
      { unique: true, fields: ["roomId", "rowLabel", "seatNumber"] }
    ]
  });
  return Seat;
};
