// Autenticacion por llave de solo lectura (proveedor de datos). Se envia en el encabezado x-api-key.
const crypto = require("crypto");
const db = require("../models");

const hashDe = (k) => crypto.createHash("sha256").update(String(k)).digest("hex");

const conLlave = async (req, res, next) => {
  const llave = String(req.headers["x-api-key"] || "").trim();
  if (!/^nbp_[a-f0-9]{48}$/.test(llave)) return res.status(401).send({ message: "Llave de datos ausente o invalida. Envia el encabezado x-api-key." });
  try {
    const k = await db.apiKeys.findOne({ where: { keyHash: hashDe(llave) } });
    if (!k || !k.active || k.revokedAt) return res.status(401).send({ message: "Llave de datos invalida o revocada." });
    if (k.expiresAt && new Date(k.expiresAt) < new Date()) return res.status(401).send({ message: "La llave de datos vencio." });
    // Solo lectura y sin datos personales: se comporta como analista, nunca como admin
    req.userRole = "analista";
    req.userId = null;
    req.apiKeyId = k.id;
    req.apiKeyName = k.name;
    db.apiKeys.update({ lastUsedAt: new Date(), requests: db.Sequelize.literal('"requests" + 1') }, { where: { id: k.id } }).catch(() => {});
    next();
  } catch (err) {
    res.status(500).send({ message: "Error al validar la llave de datos." });
  }
};

module.exports = { conLlave, hashDe };
