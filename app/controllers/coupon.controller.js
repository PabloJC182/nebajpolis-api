const db = require("../models");
const { Op } = db.Sequelize;
const desc = require("../utils/descuentos.js");

const entero = (v) => (v === null || v === undefined || v === "" ? null : parseInt(v, 10));

// Normaliza y valida el cuerpo; devuelve { error } o { datos }
const leer = (b, parcial = false) => {
  const d = {};
  if (!parcial || b.code !== undefined) {
    d.code = desc.normalizarCodigo(b.code);
    if (!/^[A-Z0-9_-]{3,30}$/.test(d.code)) return { error: "El codigo debe tener de 3 a 30 letras, numeros, guion o guion bajo (sin espacios)." };
  }
  if (!parcial || b.type !== undefined) {
    d.type = b.type === "fixed" ? "fixed" : "percent";
  }
  if (!parcial || b.value !== undefined) {
    d.value = Number(b.value);
    const tipo = d.type ?? b.type;
    if (!(d.value > 0)) return { error: "El valor del descuento debe ser mayor a cero." };
    if (tipo !== "fixed" && d.value > 100) return { error: "Un descuento en porcentaje no puede pasar de 100." };
  }
  if (b.appliesTo !== undefined) {
    if (!["all", "tickets", "food"].includes(b.appliesTo)) return { error: "appliesTo debe ser all, tickets o food." };
    d.appliesTo = b.appliesTo;
  }
  if (b.description !== undefined) d.description = String(b.description || "").slice(0, 255);
  if (b.minAmount !== undefined) { d.minAmount = Number(b.minAmount) || 0; if (d.minAmount < 0) return { error: "El monto minimo no puede ser negativo." }; }
  if (b.maxUses !== undefined) { d.maxUses = entero(b.maxUses); if (d.maxUses !== null && !(d.maxUses > 0)) return { error: "El limite de usos debe ser mayor a cero (o vacio = ilimitado)." }; }
  if (b.perUserLimit !== undefined) { d.perUserLimit = entero(b.perUserLimit); if (d.perUserLimit !== null && !(d.perUserLimit > 0)) return { error: "El limite por persona debe ser mayor a cero (o vacio = ilimitado)." }; }
  if (b.validFrom !== undefined) d.validFrom = b.validFrom || null;
  if (b.validTo !== undefined) d.validTo = b.validTo || null;
  if (d.validFrom && d.validTo && new Date(d.validFrom) > new Date(d.validTo)) return { error: "La fecha inicial no puede ser mayor que la final." };
  if (b.status !== undefined) d.status = !!b.status;
  return { datos: d };
};

const conUsos = async (cupones) => {
  if (!cupones.length) return [];
  const filas = await db.sales.findAll({
    attributes: ["couponId", [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "usos"], [db.Sequelize.fn("COALESCE", db.Sequelize.fn("SUM", db.Sequelize.col("discountAmount")), 0), "descuento"]],
    where: { couponId: { [Op.in]: cupones.map((c) => c.id) }, status: "paid" }, group: ["couponId"], raw: true,
  });
  return cupones.map((c) => {
    const f = filas.find((x) => x.couponId === c.id);
    return { ...c.toJSON(), usos: f ? Number(f.usos) : 0, descuentoTotal: f ? Number(f.descuento) : 0 };
  });
};

exports.findAll = async (req, res) => {
  try { res.send(await conUsos(await db.coupons.findAll({ order: [["createdAt", "DESC"]] }))); }
  catch (err) { res.status(500).send({ message: err.message || "Error al listar los cupones." }); }
};

exports.create = async (req, res) => {
  const { error, datos } = leer(req.body);
  if (error) return res.status(400).send({ message: error });
  try {
    if (await db.coupons.findOne({ where: { code: datos.code } })) return res.status(409).send({ message: "Ya existe un cupon con ese codigo." });
    res.send(await db.coupons.create(datos));
  } catch (err) { res.status(500).send({ message: err.message || "Error al crear el cupon." }); }
};

exports.update = async (req, res) => {
  const { error, datos } = leer(req.body, true);
  if (error) return res.status(400).send({ message: error });
  try {
    const c = await db.coupons.findByPk(req.params.id);
    if (!c) return res.status(404).send({ message: "Cupon no encontrado." });
    if (datos.code && datos.code !== c.code && (await db.coupons.findOne({ where: { code: datos.code } }))) return res.status(409).send({ message: "Ya existe un cupon con ese codigo." });
    await c.update(datos);
    res.send({ message: "Cupon actualizado exitosamente." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al actualizar el cupon." }); }
};

exports.delete = async (req, res) => {
  try {
    const c = await db.coupons.findByPk(req.params.id);
    if (!c) return res.status(404).send({ message: "Cupon no encontrado." });
    if (await db.sales.count({ where: { couponId: c.id } })) {
      // Ya se uso: se desactiva en lugar de borrar para no perder el historial de reportes
      await c.update({ status: false });
      return res.send({ message: "El cupon ya se uso en ventas: se desactivo en lugar de eliminarse." });
    }
    await c.destroy();
    res.send({ message: "Cupon eliminado exitosamente." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al eliminar el cupon." }); }
};

// POST /api/cupones/validar { code, subBoletos, subComida }  -> vista previa del descuento (publico, con limite de peticiones)
exports.validar = async (req, res) => {
  const subBoletos = Math.max(Number(req.body.subBoletos) || 0, 0);
  const subComida = Math.max(Number(req.body.subComida) || 0, 0);
  const guestEmail = String(req.body.guestEmail || "").trim().toLowerCase() || null;
  try {
    const r = await desc.evaluarCupon({ code: req.body.code, subBoletos, subComida, userId: req.userId || null, guestEmail });
    res.send({ ok: true, code: r.cupon.code, descripcion: r.cupon.description, descuento: r.descuento, appliesTo: r.cupon.appliesTo });
  } catch (err) {
    res.status(err.status || 500).send({ ok: false, message: err.status ? err.message : "No se pudo validar el cupon." });
  }
};
