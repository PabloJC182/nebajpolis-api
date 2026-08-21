// app/models/movieCast.model.js
// Tabla intermedia entre Movie y Person. Se modela explicitamente (en vez de un
// through de solo string) porque necesita guardar el atributo extra "role"
// (ej. "actor", "director") para cada participacion.
module.exports = (sequelize, Sequelize) => {
  const MovieCast = sequelize.define("movieCast", {
    role: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });
  return MovieCast;
};
