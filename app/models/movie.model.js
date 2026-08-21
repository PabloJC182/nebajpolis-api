// app/models/movie.model.js
module.exports = (sequelize, Sequelize) => {
  const Movie = sequelize.define("movie", {
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    synopsis: {
      type: Sequelize.TEXT
    },
    durationMinutes: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    releaseDate: {
      type: Sequelize.DATEONLY
    },
    // Clasificacion por edades, ej. "PG-13", "R"
    rating: {
      type: Sequelize.STRING
    },
    posterUrl: {
      type: Sequelize.STRING
    },
    originalLanguage: {
      type: Sequelize.STRING
    },
    // Permite dejar de mostrar una pelicula en cartelera sin borrar su historial de funciones/reseñas
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Movie;
};
