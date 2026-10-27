module.exports = app => {
  const reportes = require("../controllers/report.controller.js");
  const { verifyToken, conRol } = require("../middlewares/authJwt.js");
  const router = require("express").Router();

  router.get("/resumen", [verifyToken, conRol("analista")], reportes.resumen);
  router.get("/exportar/:tipo.csv", [verifyToken, conRol("analista")], reportes.exportar);
  // La taquilla solo ve su propio corte (el controlador lo fuerza)
  router.get("/corte-caja", [verifyToken, conRol("taquilla", "analista")], reportes.corteCaja);

  app.use("/api/reportes", router);
};
