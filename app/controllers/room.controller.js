
const db = require("../models");
const Room = db.rooms;

exports.create = (req, res) => {
  if (!req.body.name || !req.body.cinemaId) {
    return res.status(400).send({ message: "name y cinemaId son requeridos." });
  }

  // La capacidad se recalcula al generar los asientos de la sala
  Room.create({
    name: req.body.name,
    capacity: req.body.capacity || 0,
    roomType: req.body.roomType,
    cinemaId: req.body.cinemaId
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la sala." }));
};


exports.findAll = (req, res) => {
  const cinemaId = req.query.cinemaId;
  const condition = cinemaId ? { cinemaId: cinemaId } : null;

  Room.findAll({
    where: condition,
    include: [db.cinemas],
    attributes: { include: [[db.sequelize.literal('(SELECT COUNT(*)::int FROM "seats" s WHERE s."roomId" = "room"."id")'), "seatCount"]] },
    order: [["cinemaId", "ASC"], ["name", "ASC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener las salas." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Room.findByPk(id, { include: [db.cinemas, db.seats] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Sala con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la sala con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Room.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Sala actualizada exitosamente." });
      else res.send({ message: `No se pudo actualizar la sala con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar la sala con id=" + id }));
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  const t = await db.sequelize.transaction();
  try {
    const funciones = await db.shows.count({ where: { roomId: id }, transaction: t });
    if (funciones > 0) {
      await t.rollback();
      return res.status(409).send({ message: `No se puede eliminar: la sala tiene ${funciones} funcion(es). Elimina o cambia esas funciones primero.` });
    }
    await db.seats.destroy({ where: { roomId: id }, transaction: t });
    const num = await Room.destroy({ where: { id }, transaction: t });
    await t.commit();
    if (num == 1) res.send({ message: "Sala eliminada exitosamente." });
    else res.send({ message: `No se pudo eliminar la sala con id=${id}. Puede que no exista.` });
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ message: "Error al eliminar la sala con id=" + id + ": " + err.message });
  }
};

// Genera la cuadricula de asientos de una sala: filas A, B, C... con N asientos cada una.
// body: { rows (1-26), seatsPerRow (1-40), replace (bool) }
exports.generarAsientos = async (req, res) => {
  const id = req.params.id;
  const rows = parseInt(req.body.rows, 10);
  const seatsPerRow = parseInt(req.body.seatsPerRow, 10);
  if (!(rows >= 1 && rows <= 26) || !(seatsPerRow >= 1 && seatsPerRow <= 40)) {
    return res.status(400).send({ message: "rows debe estar entre 1 y 26, y seatsPerRow entre 1 y 40." });
  }
  const t = await db.sequelize.transaction();
  try {
    const sala = await Room.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!sala) { await t.rollback(); return res.status(404).send({ message: `Sala con id=${id} no encontrada.` }); }

    const existentes = await db.seats.count({ where: { roomId: id }, transaction: t });
    if (existentes > 0) {
      if (!req.body.replace) {
        await t.rollback();
        return res.status(409).send({ message: `La sala ya tiene ${existentes} asientos. Marca "reemplazar" para regenerarlos.` });
      }
      const vendidos = await db.tickets.count({ include: [{ model: db.seats, where: { roomId: id }, required: true }], transaction: t });
      if (vendidos > 0) {
        await t.rollback();
        return res.status(409).send({ message: `No se pueden regenerar: hay ${vendidos} boleto(s) vendidos en esta sala. Reembolsa o elimina esas ventas primero.` });
      }
      await db.seats.destroy({ where: { roomId: id }, transaction: t });
    }

    const filas = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
    const asientos = filas.flatMap(rowLabel =>
      Array.from({ length: seatsPerRow }, (_, n) => ({ roomId: sala.id, rowLabel, seatNumber: n + 1, seatType: "regular" })));
    await db.seats.bulkCreate(asientos, { transaction: t });
    sala.capacity = asientos.length;
    await sala.save({ transaction: t });
    await t.commit();
    res.send({ message: `Se generaron ${asientos.length} asientos (${rows} filas x ${seatsPerRow}).`, total: asientos.length });
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ message: err.message || "Error al generar los asientos." });
  }
};
