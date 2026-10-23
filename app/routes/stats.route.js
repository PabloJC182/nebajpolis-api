module.exports = app => {
  const stats = require("../controllers/stats.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/resumen", [verifyToken, isAdmin], stats.resumen);

  app.use("/api/stats", router);
};
