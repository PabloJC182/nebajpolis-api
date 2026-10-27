const crypto = require("crypto");
const db = require("../models");
const { hashDe } = require("../middlewares/apiKey.js");
const { registrar } = require("../utils/audit.js");

const publica = (k) => ({
  id: k.id, name: k.name, keyPrefix: k.keyPrefix, active: k.active && !k.revokedAt,
  expiresAt: k.expiresAt, revokedAt: k.revokedAt, lastUsedAt: k.lastUsedAt, requests: k.requests, createdAt: k.createdAt,
});

// GET /api/llaves  (admin)
exports.listar = async (req, res) => {
  try { res.send((await db.apiKeys.findAll({ order: [["createdAt", "DESC"]] })).map(publica)); }
  catch (err) { res.status(500).send({ message: err.message || "Error al listar las llaves." }); }
};

// POST /api/llaves { name, expiresAt? }  (admin). La llave completa se muestra UNA sola vez.
exports.crear = async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).send({ message: "Ponle un nombre a la llave (por ejemplo, el del proveedor)." });
  let expiresAt = null;
  if (req.body.expiresAt) {
    expiresAt = new Date(req.body.expiresAt);
    if (isNaN(expiresAt) || expiresAt < new Date()) return res.status(400).send({ message: "La fecha de vencimiento debe ser futura." });
  }
  try {
    const llave = "nbp_" + crypto.randomBytes(24).toString("hex");
    const k = await db.apiKeys.create({ name, keyPrefix: llave.slice(0, 12), keyHash: hashDe(llave), expiresAt, createdBy: req.userId });
    registrar(req, { action: "crear", entity: "llaves", entityId: k.id, summary: `Creó la llave de datos "${name}" (${k.keyPrefix}…)${expiresAt ? ` · vence ${expiresAt.toISOString().slice(0, 10)}` : ""}` });
    res.send({ ...publica(k), key: llave, aviso: "Guarda esta llave ahora: no se volvera a mostrar." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al crear la llave." }); }
};

// DELETE /api/llaves/:id  (admin): revoca (queda el historial)
exports.revocar = async (req, res) => {
  try {
    const k = await db.apiKeys.findByPk(req.params.id);
    if (!k) return res.status(404).send({ message: "Llave no encontrada." });
    if (k.revokedAt) return res.status(409).send({ message: "Esta llave ya estaba revocada." });
    await k.update({ active: false, revokedAt: new Date() });
    registrar(req, { action: "revocar", entity: "llaves", entityId: k.id, summary: `Revocó la llave de datos "${k.name}" (${k.keyPrefix}…)` });
    res.send({ message: "Llave revocada." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al revocar la llave." }); }
};
