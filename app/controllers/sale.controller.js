// app/controllers/sale.controller.js
const db = require("../models");
const Op = db.Sequelize.Op;

// Crea una venta completa: valida asientos disponibles, aplica promocion si aplica,
// y crea la venta junto con sus boletos dentro de una misma transaccion.
// Body esperado: { showId, seatIds: [1, 2, 3], promotionId (opcional) }
exports.create = async (req, res) => {
  const { showId, seatIds, promotionId } = req.body;

  if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).send({ message: "showId y un arreglo seatIds no vacio son requeridos." });
  }

  const t = await db.sequelize.transaction();

  try {
    const show = await db.shows.findByPk(showId, { transaction: t });
    if (!show) {
      await t.rollback();
      return res.status(404).send({ message: `Funcion con id=${showId} no encontrada.` });
    }

    // Bloqueamos las filas de boletos existentes para estos asientos+funcion mientras
    // dura la transaccion, para que dos ventas simultaneas no pasen ambas esta validacion.
    const asientosOcupados = await db.tickets.findAll({
      where: { showId: showId, seatId: { [Op.in]: seatIds } },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (asientosOcupados.length > 0) {
      await t.rollback();
      return res.status(409).send({
        message: "Uno o mas asientos seleccionados ya fueron vendidos para esta funcion.",
        seatIdsOcupados: asientosOcupados.map(ticket => ticket.seatId)
      });
    }

    // Precio base de la funcion, con descuento de promocion si es valida y esta vigente
    let precioUnitario = parseFloat(show.basePrice);

    if (promotionId) {
      const promotion = await db.promotions.findByPk(promotionId, { transaction: t });
      const now = new Date();
      const promoVigente = promotion
        && promotion.status
        && (!promotion.validFrom || promotion.validFrom <= now)
        && (!promotion.validTo || promotion.validTo >= now);

      if (promoVigente) {
        precioUnitario = precioUnitario * (1 - parseFloat(promotion.discountPercentage) / 100);
      }
    }

    const totalAmount = precioUnitario * seatIds.length;

    const sale = await db.sales.create({
      userId: req.userId,
      totalAmount: totalAmount,
      status: "pending"
    }, { transaction: t });

    const tickets = await db.tickets.bulkCreate(
      seatIds.map(seatId => ({
        saleId: sale.id,
        showId: showId,
        seatId: seatId,
        price: precioUnitario
      })),
      { transaction: t }
    );

    await t.commit();

    // Le decimos al frontend hasta cuando tiene reservados estos asientos antes
    // de que el job de expireSales.job.js los libere automaticamente.
    const holdMinutes = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);
    const expiresAt = new Date(sale.saleDate.getTime() + holdMinutes * 60 * 1000);

    res.send({ sale, tickets, expiresAt });
  } catch (err) {
    await t.rollback();
    // Si el error viene del indice unico showId+seatId, otra venta gano la carrera
    // por el mismo asiento entre la verificacion y el commit.
    res.status(500).send({ message: err.message || "Ocurrio un error al procesar la venta." });
  }
};

// Ventas del usuario autenticado (historial de compras propio)
exports.findMine = (req, res) => {
  db.sales.findAll({
    where: { userId: req.userId },
    include: [{ model: db.tickets, include: [db.seats, db.shows] }],
    order: [["saleDate", "DESC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener tus ventas." }));
};

// Listado completo, solo para administradores (reportes de ventas)
exports.findAll = (req, res) => {
  db.sales.findAll({
    include: [db.appUsers, { model: db.tickets, include: [db.seats, db.shows] }],
    order: [["saleDate", "DESC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las ventas." }));
};

// Obtener una venta por id: el dueño de la venta o un administrador pueden verla
exports.findOne = (req, res) => {
  const id = req.params.id;

  db.sales.findByPk(id, {
    include: [db.appUsers, { model: db.tickets, include: [db.seats, db.shows] }, db.payments]
  })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Venta con id=${id} no encontrada.` });
      if (data.userId !== req.userId && req.userRole !== "admin") {
        return res.status(403).send({ message: "No tienes permiso para ver esta venta." });
      }
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la venta con id=" + id }));
};
