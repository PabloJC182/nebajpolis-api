const db = require("../models");
const { Op } = db.Sequelize;

const INCLUIR = [{ model: db.comboItems, include: [{ model: db.foodItems, attributes: ["id", "name", "price", "imageUrl", "status"] }] }];

const aJson = (c) => {
  const j = c.toJSON();
  const items = (j.comboItems || []).map((i) => ({ foodItemId: i.foodItemId, quantity: i.quantity, name: i.foodItem?.name, price: Number(i.foodItem?.price ?? 0), imageUrl: i.foodItem?.imageUrl }));
  delete j.comboItems;
  return { ...j, price: Number(j.price), items, precioComida: items.reduce((s, i) => s + i.price * i.quantity, 0) };
};

const leer = async (b) => {
  const nombre = String(b.name || "").trim();
  if (!nombre) return { error: "El nombre del combo es requerido." };
  const price = Number(b.price);
  if (!(price > 0)) return { error: "El precio del combo debe ser mayor a cero." };
  const ticketQty = parseInt(b.ticketQty ?? 1, 10);
  if (!Number.isInteger(ticketQty) || ticketQty < 1 || ticketQty > 10) return { error: "La cantidad de boletos debe estar entre 1 y 10." };
  const crudos = Array.isArray(b.items) ? b.items : [];
  const items = [];
  for (const i of crudos) {
    const foodItemId = parseInt(i.foodItemId, 10);
    const quantity = parseInt(i.quantity, 10);
    if (!foodItemId || !(quantity > 0) || quantity > 20) return { error: "Cada producto del combo necesita una cantidad entre 1 y 20." };
    const previo = items.find((x) => x.foodItemId === foodItemId);
    if (previo) previo.quantity += quantity; else items.push({ foodItemId, quantity });
  }
  if (items.length === 0) return { error: "Un combo necesita al menos un producto de dulceria." };
  const existentes = await db.foodItems.count({ where: { id: { [Op.in]: items.map((i) => i.foodItemId) } } });
  if (existentes !== items.length) return { error: "Algun producto del combo no existe." };
  if ((b.validFrom && b.validTo) && new Date(b.validFrom) > new Date(b.validTo)) return { error: "La fecha inicial no puede ser mayor que la final." };
  return {
    datos: { name: nombre, description: b.description ?? null, imageUrl: b.imageUrl || null, ticketQty, price, validFrom: b.validFrom || null, validTo: b.validTo || null, status: b.status === undefined ? true : !!b.status },
    items,
  };
};

// Publico: combos activos y vigentes (solo con productos disponibles)
exports.vigentes = async (req, res) => {
  const ahora = new Date();
  try {
    const combos = await db.combos.findAll({
      where: { status: true, [Op.and]: [{ [Op.or]: [{ validFrom: null }, { validFrom: { [Op.lte]: ahora } }] }, { [Op.or]: [{ validTo: null }, { validTo: { [Op.gte]: ahora } }] }] },
      include: INCLUIR, order: [["price", "ASC"]],
    });
    res.send(combos.map(aJson));
  } catch (err) { res.status(500).send({ message: err.message || "Error al listar los combos." }); }
};

exports.todos = async (req, res) => {
  try { res.send((await db.combos.findAll({ include: INCLUIR, order: [["createdAt", "DESC"]] })).map(aJson)); }
  catch (err) { res.status(500).send({ message: err.message || "Error al listar los combos." }); }
};

exports.create = async (req, res) => {
  const { error, datos, items } = await leer(req.body);
  if (error) return res.status(400).send({ message: error });
  const t = await db.sequelize.transaction();
  try {
    const combo = await db.combos.create(datos, { transaction: t });
    await db.comboItems.bulkCreate(items.map((i) => ({ ...i, comboId: combo.id })), { transaction: t });
    await t.commit();
    res.send(aJson(await db.combos.findByPk(combo.id, { include: INCLUIR })));
  } catch (err) { await t.rollback().catch(() => {}); res.status(500).send({ message: err.message || "Error al crear el combo." }); }
};

exports.update = async (req, res) => {
  const { error, datos, items } = await leer(req.body);
  if (error) return res.status(400).send({ message: error });
  const t = await db.sequelize.transaction();
  try {
    const combo = await db.combos.findByPk(req.params.id, { transaction: t });
    if (!combo) { await t.rollback(); return res.status(404).send({ message: "Combo no encontrado." }); }
    await combo.update(datos, { transaction: t });
    await db.comboItems.destroy({ where: { comboId: combo.id }, transaction: t });
    await db.comboItems.bulkCreate(items.map((i) => ({ ...i, comboId: combo.id })), { transaction: t });
    await t.commit();
    res.send({ message: "Combo actualizado exitosamente." });
  } catch (err) { await t.rollback().catch(() => {}); res.status(500).send({ message: err.message || "Error al actualizar el combo." }); }
};

exports.delete = async (req, res) => {
  try {
    const combo = await db.combos.findByPk(req.params.id);
    if (!combo) return res.status(404).send({ message: "Combo no encontrado." });
    if (await db.sales.count({ where: { comboId: combo.id } })) {
      await combo.update({ status: false });
      return res.send({ message: "El combo ya se vendio: se desactivo en lugar de eliminarse." });
    }
    await combo.destroy();
    res.send({ message: "Combo eliminado exitosamente." });
  } catch (err) { res.status(500).send({ message: err.message || "Error al eliminar el combo." }); }
};
