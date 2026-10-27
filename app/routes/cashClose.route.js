module.exports = app => {
  const c = require("../controllers/cashClose.controller.js");
  const { verifyToken, conRol } = require("../middlewares/authJwt.js");
  const router = require("express").Router();
  router.get("/turno", [verifyToken, conRol("taquilla")], c.turno);
  router.post("/", [verifyToken, conRol("taquilla")], c.cerrar);
  // La taquilla solo ve sus cierres (el controlador lo fuerza); analista y admin ven todos
  router.get("/", [verifyToken, conRol("taquilla", "analista")], c.listar);
  app.use("/api/cierres", router);
};
