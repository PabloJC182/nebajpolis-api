
module.exports = app => {
  const genres = require("../controllers/genre.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  
  router.get("/", genres.findAll);
  router.get("/:id", genres.findOne);

  
  router.post("/create/", [verifyToken, isAdmin, auditar("generos", "genres", "género")], genres.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("generos", "genres", "género")], genres.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("generos", "genres", "género")], genres.delete);

  // /api/genres es la ruta oficial; /api/genre se mantiene por compatibilidad
  app.use(["/api/genres", "/api/genre"], router);
};
