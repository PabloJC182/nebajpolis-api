// app/routes/show.route.js
module.exports = app => {
  const shows = require("../controllers/show.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", shows.findAll);
  router.get("/:id/seats", shows.findAvailableSeats);
  router.get("/:id", shows.findOne);

  router.post("/create/", [verifyToken, isAdmin], shows.create);
  router.put("/update/:id", [verifyToken, isAdmin], shows.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], shows.delete);

  app.use("/api/shows", router);
};
