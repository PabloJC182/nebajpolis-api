
const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");


const sequelizeOptions = {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
};


if (dbConfig.ssl) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, sequelizeOptions);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;




db.movies = require("./movie.model.js")(sequelize, Sequelize);
db.persons = require("./person.model.js")(sequelize, Sequelize);
db.movieCasts = require("./movieCast.model.js")(sequelize, Sequelize);
db.genres = require("./genre.model.js")(sequelize, Sequelize);
db.cinemas = require("./cinema.model.js")(sequelize, Sequelize);
db.rooms = require("./room.model.js")(sequelize, Sequelize);
db.seats = require("./seat.model.js")(sequelize, Sequelize);
db.shows = require("./show.model.js")(sequelize, Sequelize);
db.promotions = require("./promotion.model.js")(sequelize, Sequelize);
db.appUsers = require("./appUser.model.js")(sequelize, Sequelize);
db.sales = require("./sale.model.js")(sequelize, Sequelize);
db.tickets = require("./ticket.model.js")(sequelize, Sequelize);
db.payments = require("./payment.model.js")(sequelize, Sequelize);
db.reviews = require("./review.model.js")(sequelize, Sequelize);






db.movies.belongsToMany(db.persons, {
  through: db.movieCasts,
  foreignKey: "movieId",
  otherKey: "personId"
});
db.persons.belongsToMany(db.movies, {
  through: db.movieCasts,
  foreignKey: "personId",
  otherKey: "movieId"
});


db.movies.hasMany(db.movieCasts, { foreignKey: "movieId" });
db.movieCasts.belongsTo(db.movies, { foreignKey: "movieId" });
db.persons.hasMany(db.movieCasts, { foreignKey: "personId" });
db.movieCasts.belongsTo(db.persons, { foreignKey: "personId" });


db.movies.belongsToMany(db.genres, {
  through: "movieGenre",
  foreignKey: "movieId",
  otherKey: "genreId"
});
db.genres.belongsToMany(db.movies, {
  through: "movieGenre",
  foreignKey: "genreId",
  otherKey: "movieId"
});


db.cinemas.hasMany(db.rooms, { foreignKey: "cinemaId" });
db.rooms.belongsTo(db.cinemas, { foreignKey: "cinemaId" });


db.rooms.hasMany(db.seats, { foreignKey: "roomId" });
db.seats.belongsTo(db.rooms, { foreignKey: "roomId" });


db.rooms.hasMany(db.shows, { foreignKey: "roomId" });
db.shows.belongsTo(db.rooms, { foreignKey: "roomId" });
db.movies.hasMany(db.shows, { foreignKey: "movieId" });
db.shows.belongsTo(db.movies, { foreignKey: "movieId" });


db.shows.belongsToMany(db.promotions, {
  through: "showPromotion",
  foreignKey: "showId",
  otherKey: "promotionId"
});
db.promotions.belongsToMany(db.shows, {
  through: "showPromotion",
  foreignKey: "promotionId",
  otherKey: "showId"
});


db.appUsers.hasMany(db.sales, { foreignKey: "userId" });
db.sales.belongsTo(db.appUsers, { foreignKey: "userId" });


db.sales.hasMany(db.tickets, { foreignKey: "saleId" });
db.tickets.belongsTo(db.sales, { foreignKey: "saleId" });
db.shows.hasMany(db.tickets, { foreignKey: "showId" });
db.tickets.belongsTo(db.shows, { foreignKey: "showId" });
db.seats.hasMany(db.tickets, { foreignKey: "seatId" });
db.tickets.belongsTo(db.seats, { foreignKey: "seatId" });


db.sales.hasOne(db.payments, { foreignKey: "saleId" });
db.payments.belongsTo(db.sales, { foreignKey: "saleId" });


db.appUsers.hasMany(db.reviews, { foreignKey: "userId" });
db.reviews.belongsTo(db.appUsers, { foreignKey: "userId" });
db.movies.hasMany(db.reviews, { foreignKey: "movieId" });
db.reviews.belongsTo(db.movies, { foreignKey: "movieId" });

module.exports = db;
