module.exports = app => {
  const tickets = require("../controllers/ticket.controller.js");
  const { verifyToken, conRol } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.post("/validar", [verifyToken, conRol("taquilla")], tickets.validar);

  app.use("/api/tickets", router);
};
