// app/routes/cinema.route.js
module.exports = app => {
  const cinemas = require("../controllers/cinema.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", cinemas.findAll);
  router.get("/:id", cinemas.findOne);

  router.post("/create/", [verifyToken, isAdmin], cinemas.create);
  router.put("/update/:id", [verifyToken, isAdmin], cinemas.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], cinemas.delete);

  app.use("/api/cinemas", router);
};
