const db = require("../models");
const ticketCode = require("../utils/ticketCode.js");

// Pedido de dulceria: se valida al entregarlo (una sola vez)
async function validarPedido(saleId, marcar, res) {
  const t = await db.sequelize.transaction();
  try {
    const venta = await db.sales.findOne({
      where: { id: saleId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!venta) { await t.rollback(); return res.status(404).send({ valido: false, message: "El pedido no existe." }); }
    const [lineas, cine, cliente, ticket] = await Promise.all([
      db.saleFoodItems.findAll({ where: { saleId }, include: [db.foodItems], transaction: t }),
      venta.pickupCinemaId ? db.cinemas.findByPk(venta.pickupCinemaId, { transaction: t }) : null,
      venta.userId ? db.appUsers.findByPk(venta.userId, { attributes: ["fullName", "email"], transaction: t }) : null,
      // compra de boletos con comida: se recoge en el cine de la funcion
      venta.pickupCinemaId ? null : db.tickets.findOne({ where: { saleId }, include: [{ model: db.shows, include: [{ model: db.rooms, include: [db.cinemas] }] }], transaction: t })
    ]);
    if (lineas.length === 0) { await t.rollback(); return res.status(404).send({ valido: false, message: "Esta compra no incluye productos de dulceria." }); }
    const vence = ticketCode.venceComida(venta);
    const detalle = {
      tipo: "dulceria",
      saleId,
      cinema: cine?.name ?? ticket?.show?.room?.cinema?.name,
      validUntil: vence,
      customer: cliente?.fullName ?? cliente?.email ?? venta.guestName ?? venta.guestEmail ?? "Invitado",
      items: lineas.map(l => ({ name: l.foodItem?.name, quantity: l.quantity }))
    };
    if (venta.status !== "paid") {
      await t.rollback();
      return res.status(409).send({ valido: false, message: `El pedido no esta pagado (estado: ${venta.status}).`, ...detalle });
    }
    if (venta.pickedUpAt) {
      await t.rollback();
      return res.status(409).send({ valido: false, message: "Este pedido YA FUE ENTREGADO.", usedAt: venta.pickedUpAt, ...detalle });
    }
    if (new Date() > vence) {
      await t.rollback();
      return res.status(409).send({ valido: false, message: "El codigo de comida VENCIO (vigencia de 6 meses).", ...detalle });
    }
    if (marcar) { venta.pickedUpAt = new Date(); await venta.save({ transaction: t }); }
    await t.commit();
    res.send({ valido: true, marcada: marcar, message: marcar ? "Pedido valido. Entrega los productos." : "Pedido valido (sin marcar).", ...detalle });
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ valido: false, message: err.message || "Error al validar el pedido." });
  }
}

// POST /api/tickets/validar  { code, marcar }  (admin)
// marcar=false solo consulta; por defecto marca la entrada como usada.
exports.validar = async (req, res) => {
  const { code } = req.body;
  const marcar = req.body.marcar !== false;

  const datos = ticketCode.leer(code);
  if (!datos) {
    return res.status(400).send({ valido: false, message: "Codigo QR invalido o alterado." });
  }

  if (datos.pedido) return validarPedido(datos.saleId, marcar, res);

  const t = await db.sequelize.transaction();
  try {
    const ticket = await db.tickets.findOne({
      where: { id: datos.ticketId, saleId: datos.saleId },
      include: [
        db.seats,
        { model: db.shows, include: [db.movies, { model: db.rooms, include: [db.cinemas] }] },
        { model: db.sales, include: [{ model: db.appUsers, attributes: ["id", "fullName", "email"] }] }
      ],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: db.tickets }
    });

    if (!ticket) {
      await t.rollback();
      return res.status(404).send({ valido: false, message: "La entrada no existe (la venta pudo haberse cancelado)." });
    }

    const detalle = {
      ticketId: ticket.id,
      saleId: ticket.saleId,
      movie: ticket.show.movie?.title,
      showDatetime: ticket.show.showDatetime,
      cinema: ticket.show.room?.cinema?.name,
      room: ticket.show.room?.name,
      seat: `${ticket.seat.rowLabel}${ticket.seat.seatNumber}`,
      customer: ticket.sale.appUser?.fullName ?? ticket.sale.appUser?.email ?? ticket.sale.guestName ?? ticket.sale.guestEmail ?? "Invitado"
    };

    if (ticket.sale.status !== "paid") {
      await t.rollback();
      return res.status(409).send({ valido: false, message: `La venta no esta pagada (estado: ${ticket.sale.status}).`, ...detalle });
    }
    if (ticket.usedAt) {
      await t.rollback();
      return res.status(409).send({ valido: false, message: "Esta entrada YA FUE USADA.", usedAt: ticket.usedAt, ...detalle });
    }

    // Aviso (no bloquea): la funcion no es de hoy
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
    const dia = new Date(ticket.show.showDatetime).toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
    const aviso = hoy !== dia ? `Atencion: la funcion es el ${dia}, no hoy.` : null;

    if (marcar) {
      ticket.usedAt = new Date();
      await ticket.save({ transaction: t });
    }
    await t.commit();
    res.send({ valido: true, marcada: marcar, message: marcar ? "Entrada valida. Acceso permitido." : "Entrada valida (sin marcar).", aviso, ...detalle });
  } catch (err) {
    await t.rollback();
    res.status(500).send({ valido: false, message: err.message || "Error al validar la entrada." });
  }
};
