// app/routes/pago.route.js
module.exports = (app) => {
  const controller = require("../controllers/pago.controller.js");
  const { verificarToken } = require("../middlewares/authJwt.js"); // el nombre exacto que uses vos

  app.post(
    "/api/pago/crear-payment-intent",
    [verificarToken],
    controller.crearPaymentIntent
  );

  // El webhook NO va aquí — ya está registrado en server.js antes de
  // bodyParser.json(), con su propio express.raw(). Si lo repetís en este
  // archivo, aunque nunca llegue a ejecutarse (Express ya respondió con el
  // handler de server.js), queda como código muerto que confunde.
};