
module.exports = app => {
  const sales = require("../controllers/sale.controller.js");
  const { verifyToken, isAdmin, conRol, optionalAuth } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  
  router.post("/create/", [optionalAuth], sales.create);
  router.post("/create-food", [optionalAuth], sales.createFood);
  router.post("/taquilla", [verifyToken, conRol("taquilla")], sales.taquilla);
  router.get("/taquilla/mias", [verifyToken, conRol("taquilla")], sales.taquillaMias);
  router.get("/mias", [verifyToken], sales.findMine);
  router.get("/:id", [optionalAuth], sales.findOne);
  router.post("/:id/reenviar", [optionalAuth], sales.reenviar);
  router.post("/:id/reembolsar", [verifyToken, isAdmin], sales.reembolsar);
  router.post("/:id/cancelar", [optionalAuth], sales.cancelar);

  
  router.get("/", [verifyToken, isAdmin], sales.findAll);

  app.use("/api/sales", router);
};
