module.exports = app => {
  const k = require("../controllers/apikey.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const router = require("express").Router();
  router.get("/", [verifyToken, isAdmin], k.listar);
  router.post("/", [verifyToken, isAdmin], k.crear);
  router.delete("/:id", [verifyToken, isAdmin], k.revocar);
  app.use("/api/llaves", router);
};
