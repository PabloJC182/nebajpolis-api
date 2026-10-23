
module.exports = (sequelize, Sequelize) => {
  const Ticket = sequelize.define("ticket", {
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    // Fecha en que se valido el QR en la sala (null = aun sin usar)
    usedAt: {
      type: Sequelize.DATE
    }
  }, {
    indexes: [
      
      
      
      { unique: true, fields: ["showId", "seatId"] }
    ]
  });
  return Ticket;
};
