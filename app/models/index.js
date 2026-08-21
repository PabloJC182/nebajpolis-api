// app/models/index.js
const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

// Armamos las opciones de conexion de forma dinamica segun el ambiente
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

// Solo agregamos configuracion SSL si el ambiente actual la requiere (Neon en produccion)
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

// --------------------------------------------------------------------------
// Registro de los 14 modelos
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// Asociaciones
// --------------------------------------------------------------------------

// Movie <-> Person (N:M con atributo extra "role", via MovieCast)
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
// Tambien se exponen los registros intermedios directamente, util para
// consultar/editar el "role" de una participacion puntual.
db.movies.hasMany(db.movieCasts, { foreignKey: "movieId" });
db.movieCasts.belongsTo(db.movies, { foreignKey: "movieId" });
db.persons.hasMany(db.movieCasts, { foreignKey: "personId" });
db.movieCasts.belongsTo(db.persons, { foreignKey: "personId" });

// Movie <-> Genre (N:M simple, sin atributos extra -> junction table plana)
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

// Cinema 1:N Room
db.cinemas.hasMany(db.rooms, { foreignKey: "cinemaId" });
db.rooms.belongsTo(db.cinemas, { foreignKey: "cinemaId" });

// Room 1:N Seat
db.rooms.hasMany(db.seats, { foreignKey: "roomId" });
db.seats.belongsTo(db.rooms, { foreignKey: "roomId" });

// Room 1:N Show / Movie 1:N Show
db.rooms.hasMany(db.shows, { foreignKey: "roomId" });
db.shows.belongsTo(db.rooms, { foreignKey: "roomId" });
db.movies.hasMany(db.shows, { foreignKey: "movieId" });
db.shows.belongsTo(db.movies, { foreignKey: "movieId" });

// Show <-> Promotion (N:M simple -> junction table plana)
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

// AppUser 1:N Sale
db.appUsers.hasMany(db.sales, { foreignKey: "userId" });
db.sales.belongsTo(db.appUsers, { foreignKey: "userId" });

// Sale 1:N Ticket / Show 1:N Ticket / Seat 1:N Ticket
db.sales.hasMany(db.tickets, { foreignKey: "saleId" });
db.tickets.belongsTo(db.sales, { foreignKey: "saleId" });
db.shows.hasMany(db.tickets, { foreignKey: "showId" });
db.tickets.belongsTo(db.shows, { foreignKey: "showId" });
db.seats.hasMany(db.tickets, { foreignKey: "seatId" });
db.tickets.belongsTo(db.seats, { foreignKey: "seatId" });

// Sale 1:1 Payment (una venta genera un unico cobro; Payment aislado de Sale por RNF-02)
db.sales.hasOne(db.payments, { foreignKey: "saleId" });
db.payments.belongsTo(db.sales, { foreignKey: "saleId" });

// AppUser 1:N Review / Movie 1:N Review
db.appUsers.hasMany(db.reviews, { foreignKey: "userId" });
db.reviews.belongsTo(db.appUsers, { foreignKey: "userId" });
db.movies.hasMany(db.reviews, { foreignKey: "movieId" });
db.reviews.belongsTo(db.movies, { foreignKey: "movieId" });

module.exports = db;
