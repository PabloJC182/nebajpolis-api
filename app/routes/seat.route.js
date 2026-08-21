// app/routes/seat.route.js
module.exports = app => {
  const seats = require("../controllers/seat.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", seats.findAll);
  router.get("/:id", seats.findOne);

  router.post("/create/", [verifyToken, isAdmin], seats.create);
  router.post("/bulk", [verifyToken, isAdmin], seats.createBulk);
  router.put("/update/:id", [verifyToken, isAdmin], seats.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], seats.delete);

  app.use("/api/seats", router);
};
