// app/routes/pago.route.js
module.exports = app => {
  const pagos = require("../controllers/pago.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.post("/crear-sesion", [verifyToken], pagos.crearSesion);

  app.use("/api/pago", router);
};
