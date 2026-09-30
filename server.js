


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




app.post("/api/pago/webhook", express.raw({ type: "application/json" }),
  require("./app/controllers/pago.controller.js").webhook
);


app.use(bodyParser.json());


app.use(bodyParser.urlencoded({ extended: true }));

const db = require("./app/models");
db.sequelize.sync();







const expirePendingSales = require("./app/jobs/expireSales.job.js")(db);
setInterval(expirePendingSales, 60 * 1000);
expirePendingSales(); 


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
