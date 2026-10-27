
module.exports = app => {
  const rooms = require("../controllers/room.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", rooms.findAll);
  router.get("/:id", rooms.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("salas", "rooms", "sala")], rooms.create);
  router.post("/:id/generar-asientos", [verifyToken, isAdmin], rooms.generarAsientos);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("salas", "rooms", "sala")], rooms.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("salas", "rooms", "sala")], rooms.delete);

  app.use("/api/rooms", router);
};
