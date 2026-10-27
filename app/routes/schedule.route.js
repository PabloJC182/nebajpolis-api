module.exports = app => {
  const s = require("../controllers/schedule.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const router = require("express").Router();
  router.get("/", [verifyToken, isAdmin], s.listar);
  router.post("/", [verifyToken, isAdmin], s.crear);
  router.put("/:id", [verifyToken, isAdmin], s.actualizar);
  router.delete("/:id", [verifyToken, isAdmin], s.eliminar);
  router.post("/:id/enviar-ahora", [verifyToken, isAdmin], s.enviarAhora);
  app.use("/api/reporte-programado", router);
};
