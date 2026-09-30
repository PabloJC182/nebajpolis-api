
module.exports = (sequelize, Sequelize) => {
  const Ticket = sequelize.define("ticket", {
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    indexes: [
      
      
      
      { unique: true, fields: ["showId", "seatId"] }
    ]
  });
  return Ticket;
};
