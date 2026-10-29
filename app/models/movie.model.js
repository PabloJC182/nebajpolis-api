
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
    
    rating: {
      type: Sequelize.STRING
    },
    posterUrl: {
      type: Sequelize.STRING(1000)
    },
    
    
    backdropUrl: {
      type: Sequelize.STRING(1000)
    },
    trailerUrl: {
      type: Sequelize.STRING(1000)
    },
    originalLanguage: {
      type: Sequelize.STRING
    },
    country: {
      type: Sequelize.STRING
    },
    subtitles: {
      type: Sequelize.STRING
    },
    
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Movie;
};
