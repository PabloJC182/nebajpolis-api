// server.js
// IMPORTANTE: dotenv debe cargarse antes que cualquier require que dependa de process.env
// (por eso "./app/models" se importa mas abajo, despues de esta seccion).
const dotenv = require("dotenv");
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

var corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
};

app.use(cors(corsOptions));

// El endpoint de webhook de Stripe necesita el body crudo (raw), no parseado como
// JSON, porque Stripe firma el cuerpo exacto de la solicitud. Por eso se registra
// ANTES de bodyParser.json(); el resto de rutas de /api/pago sí usan JSON normal.
app.post("/api/pago/webhook", express.raw({ type: "application/json" }),
  require("./app/controllers/pago.controller.js").webhook
);

// Parsear requests de tipo application/json
app.use(bodyParser.json());

// Parsear requests de tipo application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const db = require("./app/models");
db.sequelize.sync();
// // Si necesitas recrear las tablas desde cero (¡cuidado, borra los datos!):
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and re-sync db.");
// });

// Libera asientos de ventas "pending" que superaron el tiempo de reserva
// (SALE_HOLD_MINUTES, 10 minutos por defecto). Corre cada minuto.
const expirePendingSales = require("./app/jobs/expireSales.job.js")(db);
setInterval(expirePendingSales, 60 * 1000);
expirePendingSales(); // tambien se corre una vez al arrancar el servidor

// Ruta simple de prueba, confirma que el servidor y el ambiente estan bien configurados
app.get("/", (req, res) => {
  res.json({ message: "DERCAS - Cine API", ambiente: process.env.NODE_ENV || "development" });
});

require("./app/routes/auth.route")(app);
require("./app/routes/movie.route")(app);
require("./app/routes/genre.route")(app);
require("./app/routes/cinema.route")(app);
require("./app/routes/room.route")(app);
require("./app/routes/seat.route")(app);
require("./app/routes/show.route")(app);
require("./app/routes/promotion.route")(app);
require("./app/routes/sale.route")(app);
require("./app/routes/pago.route")(app);
require("./app/routes/review.route")(app);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} [ambiente: ${process.env.NODE_ENV || "development"}].`);
});
