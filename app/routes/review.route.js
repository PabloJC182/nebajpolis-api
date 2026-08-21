// app/routes/review.route.js
module.exports = app => {
  const reviews = require("../controllers/review.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  // Lectura publica: cualquiera puede ver las reseñas de una pelicula
  router.get("/", reviews.findAll);
  router.get("/:id", reviews.findOne);

  // Escribir/editar/borrar reseñas requiere estar autenticado
  router.post("/create/", [verifyToken], reviews.create);
  router.put("/update/:id", [verifyToken], reviews.update);
  router.delete("/delete/:id", [verifyToken], reviews.delete);

  app.use("/api/reviews", router);
};
