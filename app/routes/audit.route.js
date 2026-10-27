module.exports = app => {
  const audit = require("../controllers/audit.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const router = require("express").Router();
  router.get("/", [verifyToken, isAdmin], audit.listar);
  app.use("/api/auditoria", router);
};
