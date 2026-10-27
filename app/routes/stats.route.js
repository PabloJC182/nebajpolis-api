module.exports = app => {
  const stats = require("../controllers/stats.controller.js");
  const { verifyToken, conRol } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/resumen", [verifyToken, conRol("analista")], stats.resumen);

  app.use("/api/stats", router);
};
