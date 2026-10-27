const db = require("../models");
const { Op } = db.Sequelize;

const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// GET /api/auditoria?desde=&hasta=&entidad=&accion=&q=&limit=&offset=  (admin)
exports.listar = async (req, res) => {
  const where = {};
  const rango = {};
  if (esFecha(req.query.desde)) rango[Op.gte] = new Date(`${req.query.desde}T00:00:00-06:00`);
  if (esFecha(req.query.hasta)) rango[Op.lt] = new Date(new Date(`${req.query.hasta}T00:00:00-06:00`).getTime() + 864e5);
  if (rango[Op.gte] || rango[Op.lt]) where.createdAt = rango;
  if (req.query.entidad) where.entity = String(req.query.entidad).slice(0, 40);
  if (req.query.accion) where.action = String(req.query.accion).slice(0, 40);
  const q = String(req.query.q || "").trim().slice(0, 80);
  if (q) where[Op.or] = [{ actor: { [Op.iLike]: `%${q}%` } }, { summary: { [Op.iLike]: `%${q}%` } }];
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const { count, rows } = await db.auditLogs.findAndCountAll({ where, order: [["createdAt", "DESC"], ["id", "DESC"]], limit, offset });
    const entidades = await db.auditLogs.findAll({ attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("entity")), "entity"]], raw: true });
    const acciones = await db.auditLogs.findAll({ attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("action")), "action"]], raw: true });
    res.send({ total: count, items: rows, entidades: entidades.map((e) => e.entity).sort(), acciones: acciones.map((a) => a.action).sort() });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error al consultar la bitacora." });
  }
};
