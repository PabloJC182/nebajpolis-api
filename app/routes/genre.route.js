// app/routes/genre.route.js
module.exports = app => {
  const genres = require("../controllers/genre.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  // Lectura publica: cualquier visitante puede ver los generos disponibles
  router.get("/", genres.findAll);
  router.get("/:id", genres.findOne);

  // Gestion: solo usuarios autenticados (admin) pueden crear/editar/borrar
  router.post("/create/", [verifyToken], genres.create);
  router.put("/update/:id", [verifyToken], genres.update);
  router.delete("/delete/:id", [verifyToken], genres.delete);

  app.use("/api/genre", router);
};
