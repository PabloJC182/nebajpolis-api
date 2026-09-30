
module.exports = (sequelize, Sequelize) => {
  const Room = sequelize.define("room", {
    
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    capacity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    
    roomType: {
      type: Sequelize.STRING,
      defaultValue: "2D"
    }
  });
  return Room;
};
