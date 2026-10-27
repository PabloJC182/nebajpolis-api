// API de datos para el proveedor: SOLO lectura (GET), sin datos personales, autenticada con x-api-key.
module.exports = app => {
  const rep = require("../controllers/report.controller.js");
  const inv = require("../controllers/inventory.controller.js");
  const { conLlave } = require("../middlewares/apiKey.js");
  const rateLimit = require("express-rate-limit");
  const router = require("express").Router();

  router.use(rateLimit({
    windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => String(req.headers["x-api-key"] || req.ip).slice(0, 80),
    message: { message: "Demasiadas peticiones con esta llave. Intenta de nuevo en unos minutos." },
  }));

  router.get("/", conLlave, (req, res) => res.send({
    descripcion: "API de datos de Nebajpolis (solo lectura, sin datos personales). Autenticacion: encabezado x-api-key.",
    filtros: "desde=YYYY-MM-DD, hasta=YYYY-MM-DD, cineId, peliculaId, canal=online|box_office, tipo=tickets|food",
    endpoints: [
      "GET /api/datos/resumen",
      "GET /api/datos/exportar/{ventas|boletos|comida|funciones}.csv",
      "GET /api/datos/inventario",
    ],
  }));
  router.get("/resumen", conLlave, rep.resumen);
  router.get("/exportar/:tipo.csv", conLlave, rep.exportar);
  router.get("/inventario", conLlave, inv.listar);

  app.use("/api/datos", router);
};
