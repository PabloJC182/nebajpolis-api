module.exports = app => {
  const inv = require("../controllers/inventory.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const router = require("express").Router();
  router.get("/", [verifyToken, isAdmin], inv.listar);
  router.get("/movimientos", [verifyToken, isAdmin], inv.movimientos);
  router.post("/:id/ajuste", [verifyToken, isAdmin], inv.ajustar);
  router.put("/:id/config", [verifyToken, isAdmin], inv.configurar);
  app.use("/api/inventario", router);
};
