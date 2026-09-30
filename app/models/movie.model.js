
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
      type: Sequelize.STRING
    },
    
    
    backdropUrl: {
      type: Sequelize.STRING
    },
    originalLanguage: {
      type: Sequelize.STRING
    },
    
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Movie;
};
