// app/models/genre.model.js
module.exports = (sequelize, Sequelize) => {
  const Genre = sequelize.define("genre", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    }
  });
  return Genre;
};
