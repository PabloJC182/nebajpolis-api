const db = require("../models");
const stock = require("../utils/stock.js");
const { registrar } = require("../utils/audit.js");

const estado = (i) => ({
  id: i.id, name: i.name, category: i.category, price: Number(i.price), status: i.status,
  stock: i.stock, stockMin: i.stockMin ?? 5,
  controlado: i.stock !== null && i.stock !== undefined,
  agotado: i.stock !== null && i.stock !== undefined && i.stock <= 0,
  bajo: i.stock !== null && i.stock !== undefined && i.stock > 0 && i.stock <= (i.stockMin ?? 5),
});

// GET /api/inventario  (admin)
exports.listar = async (req, res) => {
  try {
    const items = await db.foodItems.findAll({ order: [["category", "ASC"], ["name", "ASC"]] });
    res.send(items.map(estado));
  } catch (err) { res.status(500).send({ message: err.message || "Error al listar el inventario." }); }
};

// POST /api/inventario/:id/ajuste { tipo: reposicion|merma|conteo, cantidad, nota }  (admin)
exports.ajustar = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tipo = String(req.body.tipo || "");
  const cantidad = parseInt(req.body.cantidad, 10);
  const nota = String(req.body.nota || "").trim().slice(0, 200) || null;
  if (!["reposicion", "merma", "conteo"].includes(tipo)) return res.status(400).send({ message: "Tipo invalido: reposicion, merma o conteo." });
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 100000) return res.status(400).send({ message: "La cantidad debe ser un entero entre 0 y 100000." });
  if (tipo !== "conteo" && cantidad === 0) return res.status(400).send({ message: "La cantidad debe ser mayor a cero." });
  if (tipo === "merma" && !nota) return res.status(400).send({ message: "Indica el motivo de la merma (se registra en la bitacora)." });

  const t = await db.sequelize.transaction();
  try {
    const item = await db.foodItems.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) { await t.rollback(); return res.status(404).send({ message: "Producto no encontrado." }); }
    const controlado = item.stock !== null && item.stock !== undefined;
    if (!controlado && tipo !== "conteo") {
      await t.rollback();
      return res.status(409).send({ message: "Este producto no tiene control de inventario. Registra primero un conteo inicial." });
    }
    const antes = controlado ? item.stock : 0;
    const despues = tipo === "conteo" ? cantidad : tipo === "reposicion" ? antes + cantidad : antes - cantidad;
    if (despues < 0) { await t.rollback(); return res.status(409).send({ message: `No puedes descontar ${cantidad}: solo hay ${antes}.` }); }
    item.stock = despues;
    await item.save({ transaction: t });
    await db.stockMovements.create({ foodItemId: id, delta: despues - antes, stockAfter: despues, reason: tipo, userId: req.userId, note: nota }, { transaction: t });
    await t.commit();
    registrar(req, {
      action: "ajustar_stock", entity: "inventario", entityId: id,
      summary: `${tipo === "reposicion" ? "Repuso" : tipo === "merma" ? "Registró merma de" : "Contó"} ${cantidad} de "${item.name}" (${controlado ? antes : "sin control"} → ${despues})${nota ? ` · ${nota}` : ""}`,
      meta: { tipo, antes: controlado ? antes : null, despues, nota },
    });
    res.send(estado(item));
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ message: err.message || "Error al ajustar el inventario." });
  }
};

// PUT /api/inventario/:id/config { stockMin, controlar }  (admin). controlar:false deja el producto sin control (stock = null)
exports.configurar = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const item = await db.foodItems.findByPk(id);
    if (!item) return res.status(404).send({ message: "Producto no encontrado." });
    const cambios = [];
    if (req.body.stockMin !== undefined) {
      const m = parseInt(req.body.stockMin, 10);
      if (!Number.isInteger(m) || m < 0 || m > 100000) return res.status(400).send({ message: "El minimo debe ser un entero de 0 en adelante." });
      if (m !== item.stockMin) { cambios.push(`minimo ${item.stockMin} → ${m}`); item.stockMin = m; }
    }
    if (req.body.controlar === false && item.stock !== null) { cambios.push("quitó el control de inventario"); item.stock = null; }
    if (cambios.length === 0) return res.send(estado(item));
    await item.save();
    registrar(req, { action: "configurar_stock", entity: "inventario", entityId: id, summary: `"${item.name}": ${cambios.join("; ")}` });
    res.send(estado(item));
  } catch (err) { res.status(500).send({ message: err.message || "Error al configurar el producto." }); }
};

// GET /api/inventario/movimientos?foodItemId=&limit=  (admin)
exports.movimientos = async (req, res) => {
  const where = {};
  if (req.query.foodItemId) where.foodItemId = parseInt(req.query.foodItemId, 10) || -1;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  try {
    const rows = await db.stockMovements.findAll({ where, include: [{ model: db.foodItems, attributes: ["id", "name"] }], order: [["createdAt", "DESC"], ["id", "DESC"]], limit });
    res.send(rows);
  } catch (err) { res.status(500).send({ message: err.message || "Error al listar los movimientos." }); }
};

exports.stockBajo = async () => {
  const items = await db.foodItems.findAll({ where: { status: true }, order: [["name", "ASC"]] });
  return items.map(estado).filter((i) => i.agotado || i.bajo);
};
