const db = require("../models");
const mail = require("../services/mail.service.js");
const reporte = require("../services/reporte.service.js");
const { registrar } = require("../utils/audit.js");
const { EMAIL_RE } = require("../utils/saleAccess.js");

// GET /api/reporte-programado  (admin)
exports.listar = async (req, res) => {
  try {
    const items = await db.reportSchedules.findAll({ order: [["createdAt", "DESC"]] });
    res.send({ correoConfigurado: mail.configurado(), items });
  } catch (err) { res.status(500).send({ message: err.message || "Error al listar los reportes programados." }); }
};

// POST /api/reporte-programado { email, frequency }  (admin)
exports.crear = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const frequency = req.body.frequency === "daily" ? "daily" : "weekly";
  if (!EMAIL_RE.test(email)) return res.status(400).send({ message: "Escribe un correo valido." });
  try {
    if (await db.reportSchedules.count({ where: { email, frequency } })) return res.status(409).send({ message: "Ese correo ya recibe este reporte." });
    if (await db.reportSchedules.count() >= 20) return res.status(409).send({ message: "Maximo 20 destinatarios." });
    // lastSentAt = ahora: el primer envio es el proximo lunes (semanal) o la proxima manana (diario)
    const s = await db.reportSchedules.create({ email, frequency, createdBy: req.userId, lastSentAt: new Date() });
    registrar(req, { action: "crear", entity: "reporte_programado", entityId: s.id, summary: `Programó el reporte ${frequency === "daily" ? "diario" : "semanal"} para ${email}` });
    res.send(s);
  } catch (err) { res.status(500).send({ message: err.message || "Error al programar el reporte." }); }
};

// PUT /api/reporte-programado/:id { active }
exports.actualizar = async (req, res) => {
  try {
    const s = await db.reportSchedules.findByPk(req.params.id);
    if (!s) return res.status(404).send({ message: "No encontrado." });
    const active = !!req.body.active;
    if (active !== s.active) {
      await s.update({ active });
      registrar(req, { action: "actualizar", entity: "reporte_programado", entityId: s.id, summary: `${active ? "Reactivó" : "Pausó"} el reporte ${s.frequency === "daily" ? "diario" : "semanal"} de ${s.email}` });
    }
    res.send(s);
  } catch (err) { res.status(500).send({ message: err.message || "Error al actualizar." }); }
};

// DELETE /api/reporte-programado/:id
exports.eliminar = async (req, res) => {
  try {
    const s = await db.reportSchedules.findByPk(req.params.id);
    if (!s) return res.status(404).send({ message: "No encontrado." });
    await s.destroy();
    registrar(req, { action: "eliminar", entity: "reporte_programado", entityId: s.id, summary: `Quitó a ${s.email} del reporte ${s.frequency === "daily" ? "diario" : "semanal"}` });
    res.send({ message: "Eliminado." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al eliminar." }); }
};

// POST /api/reporte-programado/:id/enviar-ahora  (prueba: manda los ultimos 7 dias / ayer)
exports.enviarAhora = async (req, res) => {
  if (!mail.configurado()) return res.status(503).send({ message: "El envio de correos no esta configurado en el servidor (BREVO_API_KEY y MAIL_FROM)." });
  try {
    const s = await db.reportSchedules.findByPk(req.params.id);
    if (!s) return res.status(404).send({ message: "No encontrado." });
    const rango = await reporte.enviarSchedule(s, reporte.periodo(s.frequency, undefined, { ultimos7: true }));
    registrar(req, { action: "enviar_reporte", entity: "reporte_programado", entityId: s.id, summary: `Envió ahora el reporte (${rango.desde} a ${rango.hasta}) a ${s.email}` });
    res.send({ message: `Reporte enviado a ${s.email} (${rango.desde} a ${rango.hasta}).` });
  } catch (err) {
    console.error("[reporte] Error al enviar ahora:", err.message);
    res.status(502).send({ message: "No se pudo enviar: " + err.message });
  }
};
