// app/routes/room.route.js
module.exports = app => {
  const rooms = require("../controllers/room.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", rooms.findAll);
  router.get("/:id", rooms.findOne);

  router.post("/create/", [verifyToken, isAdmin], rooms.create);
  router.put("/update/:id", [verifyToken, isAdmin], rooms.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], rooms.delete);

  app.use("/api/rooms", router);
};
