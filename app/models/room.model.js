// app/models/room.model.js
module.exports = (sequelize, Sequelize) => {
  const Room = sequelize.define("room", {
    // Nombre o numero de sala, ej. "Sala 1", "Sala VIP"
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    capacity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    // Tipo de sala, ej. "2D", "3D", "VIP"
    roomType: {
      type: Sequelize.STRING,
      defaultValue: "2D"
    }
  });
  return Room;
};
