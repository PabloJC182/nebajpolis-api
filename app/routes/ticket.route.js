module.exports = app => {
  const tickets = require("../controllers/ticket.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.post("/validar", [verifyToken, isAdmin], tickets.validar);

  app.use("/api/tickets", router);
};
