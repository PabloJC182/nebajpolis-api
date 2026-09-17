// app/routes/pago.route.js
module.exports = (app) => {
  const controller = require("../controllers/pago.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");

  app.post(
    "/api/pago/crear-payment-intent",
    [verifyToken],
    controller.crearPaymentIntent
  );
};