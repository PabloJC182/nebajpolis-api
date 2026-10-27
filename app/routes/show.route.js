
module.exports = app => {
  const shows = require("../controllers/show.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", shows.findAll);
  router.get("/:id/seats", shows.findAvailableSeats);
  router.get("/:id", shows.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("funciones", "shows", "función")], shows.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("funciones", "shows", "función")], shows.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("funciones", "shows", "función")], shows.delete);

  app.use("/api/shows", router);
};
