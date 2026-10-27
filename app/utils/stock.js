// Existencias de dulceria. stock = null significa "sin control": nada se descuenta ni se devuelve.
// Todo se hace dentro de la transaccion de la venta, con el producto bloqueado (sin sobreventa).
const db = require("../models");

const errorStock = (msg) => Object.assign(new Error(msg), { status: 409, sinStock: true });

async function mover(t, { foodItemId, delta, reason, saleId = null, userId = null, note = null }) {
  const item = await db.foodItems.findByPk(foodItemId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!item) return null;
  if (item.stock === null || item.stock === undefined) return { item, controlado: false };
  const despues = item.stock + delta;
  if (despues < 0) throw errorStock(`No hay existencias suficientes de "${item.name}" (quedan ${item.stock}).`);
  item.stock = despues;
  await item.save({ transaction: t });
  await db.stockMovements.create({ foodItemId, delta, stockAfter: despues, reason, saleId, userId, note }, { transaction: t });
  return { item, controlado: true };
}

// Descuenta las lineas de comida de una venta (apartado al reservar). Marca cada linea para poder devolverla.
async function descontarVenta(t, saleId, userId = null) {
  const lineas = await db.saleFoodItems.findAll({ where: { saleId }, order: [["foodItemId", "ASC"], ["id", "ASC"]], transaction: t });
  for (const l of lineas) {
    const r = await mover(t, { foodItemId: l.foodItemId, delta: -l.quantity, reason: "venta", saleId, userId });
    if (r?.controlado) { l.stockApplied = true; await l.save({ transaction: t }); }
  }
}

// Devuelve lo que esa venta habia descontado (vencio, se cancelo o se reembolso). Idempotente.
async function reponerVenta(t, saleId, reason = "devolucion") {
  const lineas = await db.saleFoodItems.findAll({ where: { saleId, stockApplied: true }, order: [["foodItemId", "ASC"], ["id", "ASC"]], transaction: t });
  for (const l of lineas) {
    await mover(t, { foodItemId: l.foodItemId, delta: l.quantity, reason, saleId });
    l.stockApplied = false;
    await l.save({ transaction: t });
  }
}

module.exports = { mover, descontarVenta, reponerVenta };
