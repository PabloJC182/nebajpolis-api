
module.exports = app => {
  const seats = require("../controllers/seat.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", seats.findAll);
  router.get("/:id", seats.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("asientos", "seats", "asiento")], seats.create);
  router.post("/bulk", [verifyToken, isAdmin], seats.createBulk);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("asientos", "seats", "asiento")], seats.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("asientos", "seats", "asiento")], seats.delete);

  app.use("/api/seats", router);
};
