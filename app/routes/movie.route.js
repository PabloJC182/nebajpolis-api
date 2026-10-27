
module.exports = app => {
  const movies = require("../controllers/movie.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  
  router.get("/", movies.findAll);
  
  router.get("/activas", movies.findAllActive);
  router.get("/:id", movies.findOne);

  
  router.post("/create/", [verifyToken, isAdmin, auditar("peliculas", "movies", "película")], movies.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("peliculas", "movies", "película")], movies.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("peliculas", "movies", "película")], movies.delete);
  router.post("/:id/cast", [verifyToken, isAdmin], movies.addCast);
  router.delete("/:id/cast/:personId", [verifyToken, isAdmin], movies.removeCast);

  app.use("/api/movies", router);
};
