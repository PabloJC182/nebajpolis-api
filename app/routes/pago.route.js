
module.exports = (app) => {
  const controller = require("../controllers/pago.controller.js");
  const { optionalAuth } = require("../middlewares/authJwt.js");

  app.post(
    "/api/pago/crear-payment-intent",
    [optionalAuth],
    controller.crearPaymentIntent
  );

  app.post(
    "/api/pago/confirmar",
    [optionalAuth],
    controller.confirmar
  );
};
