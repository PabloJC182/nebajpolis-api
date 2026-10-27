
module.exports = app => {
  const cinemas = require("../controllers/cinema.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", cinemas.findAll);
  router.get("/:id", cinemas.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("cines", "cinemas", "cine")], cinemas.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("cines", "cinemas", "cine")], cinemas.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("cines", "cinemas", "cine")], cinemas.delete);

  app.use("/api/cinemas", router);
};
