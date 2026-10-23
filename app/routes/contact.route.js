const rateLimit = require("express-rate-limit");

module.exports = app => {
  const contact = require("../controllers/contact.controller.js");
  // Anti-spam: pocos mensajes por IP y hora
  const limite = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, skipFailedRequests: true, standardHeaders: true, legacyHeaders: false, message: { message: "Enviaste muchos mensajes. Intenta de nuevo más tarde." } });
  app.post("/api/contact", limite, contact.enviar);
};
