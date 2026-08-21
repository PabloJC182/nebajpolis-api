// app/routes/movie.route.js
module.exports = app => {
  const movies = require("../controllers/movie.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  // Lectura publica: cualquiera puede ver la cartelera, sin necesidad de token
  router.get("/", movies.findAll);
  // IMPORTANTE: /activas debe ir ANTES de /:id, o Express interpretaria "activas" como un id
  router.get("/activas", movies.findAllActive);
  router.get("/:id", movies.findOne);

  // Gestion (crear/editar/borrar peliculas): solo administradores
  router.post("/create/", [verifyToken, isAdmin], movies.create);
  router.put("/update/:id", [verifyToken, isAdmin], movies.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], movies.delete);

  app.use("/api/movies", router);
};
