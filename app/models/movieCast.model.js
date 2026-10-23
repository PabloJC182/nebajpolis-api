



module.exports = (sequelize, Sequelize) => {
  const MovieCast = sequelize.define("movieCast", {
    role: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });
  return MovieCast;
};
