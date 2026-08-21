// app/models/cinema.model.js
module.exports = (sequelize, Sequelize) => {
  const Cinema = sequelize.define("cinema", {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    address: {
      type: Sequelize.STRING
    },
    city: {
      type: Sequelize.STRING
    },
    phone: {
      type: Sequelize.STRING
    }
  });
  return Cinema;
};
