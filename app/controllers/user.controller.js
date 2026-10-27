const db = require("../models");
const { ROLES } = require("../config/roles.js");
const { Op } = db.Sequelize;
const { registrar } = require("../utils/audit.js");

const publico = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt });

// GET /api/users?q=&role=  (admin)
exports.findAll = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const where = {};
  if (ROLES.includes(req.query.role)) where.role = req.query.role;
  if (q) where[Op.or] = [{ fullName: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }];
  try {
    const users = await db.appUsers.findAll({ where, order: [["createdAt", "DESC"]], limit: 200 });
    res.send(users.map(publico));
  } catch (err) {
    res.status(500).send({ message: err.message || "Error al listar los usuarios." });
  }
};

// PUT /api/users/:id/role  { role }  (admin)
exports.setRole = async (req, res) => {
  const role = String(req.body.role || "");
  if (!ROLES.includes(role)) return res.status(400).send({ message: `Rol invalido. Opciones: ${ROLES.join(", ")}.` });
  const id = parseInt(req.params.id, 10);
  if (id === req.userId) return res.status(400).send({ message: "No puedes cambiar tu propio rol." });
  const t = await db.sequelize.transaction();
  try {
    const user = await db.appUsers.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) { await t.rollback(); return res.status(404).send({ message: "Usuario no encontrado." }); }
    if (user.role === "admin" && role !== "admin") {
      const admins = await db.appUsers.count({ where: { role: "admin" }, transaction: t });
      if (admins <= 1) { await t.rollback(); return res.status(409).send({ message: "Debe quedar al menos un administrador." }); }
    }
    const rolAntes = user.role;
    user.role = role;
    await user.save({ transaction: t });
    await t.commit();
    if (rolAntes !== role) registrar(req, { action: "cambiar_rol", entity: "usuarios", entityId: user.id, summary: `Cambió el rol de ${user.email}: ${rolAntes} → ${role}`, meta: { antes: rolAntes, despues: role } });
    res.send(publico(user));
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ message: err.message || "Error al cambiar el rol." });
  }
};
