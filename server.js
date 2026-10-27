


const dotenv = require("dotenv");
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Render (y otros hosts) ponen un proxy delante: necesario para que el limite por IP funcione
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));

var corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
};

app.use(cors(corsOptions));

// Limites de peticiones por IP
const limiteGeneral = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, message: { message: "Demasiadas peticiones. Intenta de nuevo en unos minutos." } });
const limiteAuth = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: "Demasiados intentos. Espera unos minutos e intenta de nuevo." } });
app.use("/api/auth/signin", limiteAuth);
app.use("/api/auth/signup", limiteAuth);
app.use("/api/auth/forgot", limiteAuth);
app.use("/api/auth/reset", limiteAuth);
// El validador de cupones se limita mas: evita adivinar codigos por fuerza bruta
app.use("/api/cupones/validar", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: "Demasiados intentos con cupones. Espera unos minutos." } }));
app.use("/api", (req, res, next) => (req.path === "/pago/webhook" ? next() : limiteGeneral(req, res, next)));




app.post("/api/pago/webhook", express.raw({ type: "application/json" }),
  require("./app/controllers/pago.controller.js").webhook
);


app.use(bodyParser.json());


app.use(bodyParser.urlencoded({ extended: true }));

const db = require("./app/models");
db.sequelize.sync()
  .then(() => console.log('[db] Tablas sincronizadas'))
  .then(() => require("./app/config/ensureSchema.js")(db.sequelize))
  .catch((err) => console.error('[db] Error al sincronizar tablas:', err.message));







const expirePendingSales = require("./app/jobs/expireSales.job.js")(db);
setInterval(expirePendingSales, 60 * 1000);
expirePendingSales(); 

// Reporte programado por correo: revisa cada 10 minutos si toca enviar
const enviarReportes = require("./app/jobs/reporteProgramado.job.js")(db);
setInterval(enviarReportes, 10 * 60 * 1000);
setTimeout(enviarReportes, 30 * 1000);


app.get("/", (req, res) => {
  res.json({ message: "DERCAS - Cine API", ambiente: process.env.NODE_ENV || "development" });
});

require("./app/routes/auth.route")(app);
require("./app/routes/movie.route")(app);
require("./app/routes/genre.route")(app);
require("./app/routes/person.route")(app);
require("./app/routes/cinema.route")(app);
require("./app/routes/room.route")(app);
require("./app/routes/seat.route")(app);
require("./app/routes/show.route")(app);
require("./app/routes/promotion.route")(app);
require("./app/routes/sale.route")(app);
require("./app/routes/pago.route")(app);
require("./app/routes/review.route")(app);
require("./app/routes/food.route")(app);
require("./app/routes/ticket.route")(app);
require("./app/routes/stats.route")(app);
require("./app/routes/contact.route")(app);
require("./app/routes/banner.route")(app);
require("./app/routes/user.route")(app);
require("./app/routes/report.route")(app);
require("./app/routes/audit.route")(app);
require("./app/routes/inventory.route")(app);
require("./app/routes/coupon.route")(app);
require("./app/routes/combo.route")(app);
require("./app/routes/apikey.route")(app);
require("./app/routes/datos.route")(app);
require("./app/routes/schedule.route")(app);
require("./app/routes/cashClose.route")(app);
require("./app/docs/swagger")(app);
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} [ambiente: ${process.env.NODE_ENV || "development"}].`);
});
