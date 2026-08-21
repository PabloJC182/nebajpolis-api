// app/routes/sale.route.js
module.exports = app => {
  const sales = require("../controllers/sale.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  // Cualquier usuario autenticado puede comprar y ver su propio historial
  router.post("/create/", [verifyToken], sales.create);
  router.get("/mias", [verifyToken], sales.findMine);
  router.get("/:id", [verifyToken], sales.findOne);

  // Listado completo de ventas: solo administradores (reportes)
  router.get("/", [verifyToken, isAdmin], sales.findAll);

  app.use("/api/sales", router);
};
