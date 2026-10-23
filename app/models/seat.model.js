
module.exports = (sequelize, Sequelize) => {
  const Seat = sequelize.define("seat", {
    
    rowLabel: {
      type: Sequelize.STRING,
      allowNull: false
    },
    seatNumber: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    
    seatType: {
      type: Sequelize.STRING,
      defaultValue: "regular"
    }
  }, {
    indexes: [
      
      { unique: true, fields: ["roomId", "rowLabel", "seatNumber"] }
    ]
  });
  return Seat;
};
