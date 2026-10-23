
module.exports = app => {
  const genres = require("../controllers/genre.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  
  router.get("/", genres.findAll);
  router.get("/:id", genres.findOne);

  
  router.post("/create/", [verifyToken, isAdmin], genres.create);
  router.put("/update/:id", [verifyToken, isAdmin], genres.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], genres.delete);

  // /api/genres es la ruta oficial; /api/genre se mantiene por compatibilidad
  app.use(["/api/genres", "/api/genre"], router);
};
