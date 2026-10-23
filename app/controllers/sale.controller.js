
const db = require("../models");
const Op = db.Sequelize.Op;
const ticketCode = require("../utils/ticketCode.js");
const mail = require("../services/mail.service.js");
const promoUtil = require("../utils/promo.js");
const { puedeAcceder, nuevoToken, EMAIL_RE } = require("../utils/saleAccess.js");

const SIN_TOKEN = { exclude: ["guestToken"] };




// Venta online (cliente o invitado) o venta en taquilla (admin, ya pagada en caja)
const procesarVenta = async (req, res, { taquilla = false } = {}) => {
  const { showId, seatIds, promotionId, foodItems } = req.body;

  if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).send({ message: "showId y un arreglo seatIds no vacio son requeridos." });
  }

  const comidaSolicitada = Array.isArray(foodItems)
    ? foodItems.filter(f => f.foodItemId && parseInt(f.quantity, 10) > 0)
    : [];

  // Invitado: sin sesion se exige un correo valido para enviar las entradas
  const esInvitado = !taquilla && !req.userId;
  const guestEmail = String(req.body.guestEmail || "").trim().toLowerCase();
  const guestName = String(req.body.guestName || "").trim().slice(0, 100);
  if (esInvitado && !EMAIL_RE.test(guestEmail)) {
    return res.status(400).send({ message: "Para comprar sin cuenta indica un correo valido donde enviaremos tus entradas." });
  }
  if (taquilla && guestEmail && !EMAIL_RE.test(guestEmail)) {
    return res.status(400).send({ message: "El correo del cliente no tiene un formato valido." });
  }
  const metodoCaja = ["cash", "pos"].includes(req.body.paymentMethod) ? req.body.paymentMethod : "cash";

  const t = await db.sequelize.transaction();

  try {
    const show = await db.shows.findByPk(showId, { transaction: t });
    if (!show) {
      await t.rollback();
      return res.status(404).send({ message: `Funcion con id=${showId} no encontrada.` });
    }

    // Si el propio usuario tiene una reserva pendiente sobre estos asientos
    // (reintento, doble clic, boton atras), se libera para volver a reservar.
    const reservasPropias = taquilla ? [] : await db.sales.findAll({
      where: esInvitado ? { userId: null, guestEmail, status: "pending" } : { userId: req.userId, status: "pending" },
      include: [{ model: db.tickets, where: { showId: showId, seatId: { [Op.in]: seatIds } }, required: true }],
      transaction: t
    });
    for (const previa of reservasPropias) {
      await db.tickets.destroy({ where: { saleId: previa.id }, transaction: t });
      previa.status = "expired";
      await previa.save({ transaction: t });
    }

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

    let precioUnitario = parseFloat(show.basePrice);

    if (promotionId) {
      const promotion = await db.promotions.findByPk(promotionId, { transaction: t });
      if (!promotion) {
        await t.rollback();
        return res.status(400).send({ message: "La promocion seleccionada no existe." });
      }
      // Vigencia + dia de la semana de la funcion: si no aplica, se rechaza (no se cobra distinto en silencio)
      const v = promoUtil.validar(promotion, show.showDatetime);
      if (!v.ok) {
        await t.rollback();
        return res.status(400).send({ message: v.motivo, promoInvalida: true });
      }
      precioUnitario = precioUnitario * (1 - parseFloat(promotion.discountPercentage) / 100);
    }

    // Comida: el precio se toma de la BD, nunca del cliente
    let totalComida = 0;
    const lineasComida = [];

    if (comidaSolicitada.length > 0) {
      const productos = await db.foodItems.findAll({
        where: { id: { [Op.in]: comidaSolicitada.map(f => f.foodItemId) }, status: true },
        transaction: t
      });

      for (const item of comidaSolicitada) {
        const cantidad = parseInt(item.quantity, 10);
        const producto = productos.find(p => p.id === parseInt(item.foodItemId, 10));

        if (!producto) {
          await t.rollback();
          return res.status(404).send({ message: `Producto de comida con id=${item.foodItemId} no encontrado o no disponible.` });
        }
        if (cantidad > 20) {
          await t.rollback();
          return res.status(400).send({ message: "La cantidad maxima por producto es 20." });
        }

        totalComida += parseFloat(producto.price) * cantidad;
        lineasComida.push({ foodItemId: producto.id, quantity: cantidad, unitPrice: producto.price });
      }
    }

    const totalAmount = precioUnitario * seatIds.length + totalComida;

    const sale = await db.sales.create({
      userId: esInvitado || taquilla ? null : req.userId,
      totalAmount: totalAmount,
      status: taquilla ? "paid" : "pending",
      ...(esInvitado ? { guestToken: nuevoToken() } : {}),
      ...(esInvitado || taquilla ? { guestEmail: guestEmail || null, guestName: guestName || null } : {}),
      ...(taquilla ? { channel: "box_office", soldBy: req.userId } : {})
    }, { transaction: t });

    if (taquilla) {
      await db.payments.create({ saleId: sale.id, amount: totalAmount, status: "completed", method: metodoCaja }, { transaction: t });
    }

    const tickets = await db.tickets.bulkCreate(
      seatIds.map(seatId => ({
        saleId: sale.id,
        showId: showId,
        seatId: seatId,
        price: precioUnitario
      })),
      { transaction: t }
    );

    const comida = lineasComida.length > 0
      ? await db.saleFoodItems.bulkCreate(
          lineasComida.map(l => ({ ...l, saleId: sale.id })),
          { transaction: t }
        )
      : [];

    await t.commit();

    if (taquilla) {
      if (guestEmail && mail.configurado()) {
        mail.enviarEntradas(sale.id).catch(err => console.error("[mail] No se pudo enviar las entradas de taquilla:", err.message));
      }
      const completa = await db.sales.findByPk(sale.id, {
        attributes: SIN_TOKEN,
        include: [
          { model: db.tickets, include: [db.seats, { model: db.shows, include: [db.movies, { model: db.rooms, include: [db.cinemas] }] }] },
          { model: db.saleFoodItems, include: [db.foodItems] }
        ]
      });
      return res.send({ sale: ticketCode.conCodigos(completa) });
    }

    const holdMinutes = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);
    const expiresAt = new Date(sale.saleDate.getTime() + holdMinutes * 60 * 1000);

    // El token de invitado solo se entrega aqui, a quien creo la venta
    res.send({ sale, tickets, foodItems: comida, expiresAt, ...(esInvitado ? { guestToken: sale.guestToken } : {}) });
  } catch (err) {
    await t.rollback();
    res.status(500).send({ message: err.message || "Ocurrio un error al procesar la venta." });
  }
};


exports.create = (req, res) => procesarVenta(req, res);

// Pedido de dulceria sin boletos: se paga en linea y se recoge en el cine con un codigo QR
exports.createFood = async (req, res) => {
  const { cinemaId } = req.body;
  const items = Array.isArray(req.body.foodItems)
    ? req.body.foodItems.filter(f => f.foodItemId && parseInt(f.quantity, 10) > 0)
    : [];
  if (!cinemaId) return res.status(400).send({ message: "Elige el cine donde recogeras tu pedido." });
  if (items.length === 0) return res.status(400).send({ message: "Agrega al menos un producto a tu pedido." });

  const esInvitado = !req.userId;
  const guestEmail = String(req.body.guestEmail || "").trim().toLowerCase();
  const guestName = String(req.body.guestName || "").trim().slice(0, 100);
  if (esInvitado && !EMAIL_RE.test(guestEmail)) {
    return res.status(400).send({ message: "Para pedir sin cuenta indica un correo valido donde enviaremos tu codigo de recogida." });
  }

  const t = await db.sequelize.transaction();
  try {
    const cine = await db.cinemas.findByPk(cinemaId, { transaction: t });
    if (!cine) { await t.rollback(); return res.status(404).send({ message: "El cine elegido no existe." }); }

    const productos = await db.foodItems.findAll({
      where: { id: { [Op.in]: items.map(f => f.foodItemId) }, status: true },
      transaction: t
    });
    let total = 0;
    const lineas = [];
    for (const item of items) {
      const cantidad = parseInt(item.quantity, 10);
      const producto = productos.find(p => p.id === parseInt(item.foodItemId, 10));
      if (!producto) { await t.rollback(); return res.status(404).send({ message: `Producto con id=${item.foodItemId} no encontrado o no disponible.` }); }
      if (cantidad > 20) { await t.rollback(); return res.status(400).send({ message: "La cantidad maxima por producto es 20." }); }
      total += parseFloat(producto.price) * cantidad;
      lineas.push({ foodItemId: producto.id, quantity: cantidad, unitPrice: producto.price });
    }
    if (!(total > 0)) { await t.rollback(); return res.status(400).send({ message: "El total del pedido debe ser mayor a cero." }); }

    const sale = await db.sales.create({
      userId: esInvitado ? null : req.userId,
      totalAmount: total,
      status: "pending",
      kind: "food",
      pickupCinemaId: cine.id,
      ...(esInvitado ? { guestEmail, guestName: guestName || null, guestToken: nuevoToken() } : {})
    }, { transaction: t });
    const comida = await db.saleFoodItems.bulkCreate(lineas.map(l => ({ ...l, saleId: sale.id })), { transaction: t });
    await t.commit();

    const holdMinutes = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);
    const expiresAt = new Date(sale.saleDate.getTime() + holdMinutes * 60 * 1000);
    res.send({ sale, foodItems: comida, expiresAt, ...(esInvitado ? { guestToken: sale.guestToken } : {}) });
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).send({ message: err.message || "Ocurrio un error al crear el pedido." });
  }
};
exports.taquilla = (req, res) => procesarVenta(req, res, { taquilla: true });


exports.findMine = (req, res) => {
  db.sales.findAll({
    where: { userId: req.userId },
    attributes: SIN_TOKEN,
    include: [
      { model: db.cinemas, as: "pickupCinema", attributes: ["id", "name", "address", "city"] },

      {
        model: db.tickets,
        include: [
          db.seats,
          { model: db.shows, include: [db.movies, { model: db.rooms, include: [db.cinemas] }] }
        ]
      },
      { model: db.saleFoodItems, include: [db.foodItems] }
    ],
    order: [["saleDate", "DESC"]]
  })
    .then(data => res.send(data.map(v => v.status === "paid" ? ticketCode.conCodigos(v) : v.toJSON())))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener tus ventas." }));
};


exports.findAll = (req, res) => {
  db.sales.findAll({
    attributes: SIN_TOKEN,
    include: [{ model: db.cinemas, as: "pickupCinema", attributes: ["id", "name"] }, { model: db.appUsers, attributes: ["id", "fullName", "email"] }, { model: db.tickets, include: [db.seats, db.shows] }, { model: db.saleFoodItems, include: [db.foodItems] }],
    order: [["saleDate", "DESC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las ventas." }));
};


exports.findOne = (req, res) => {
  const id = req.params.id;

  db.sales.findByPk(id, {
    include: [
      { model: db.cinemas, as: "pickupCinema", attributes: ["id", "name", "address", "city"] },
      { model: db.appUsers, attributes: ["id", "fullName", "email"] },
      {
        model: db.tickets,
        include: [
          db.seats,
          { model: db.shows, include: [db.movies, { model: db.rooms, include: [db.cinemas] }] }
        ]
      },
      db.payments,
      { model: db.saleFoodItems, include: [db.foodItems] }
    ]  })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Venta con id=${id} no encontrada.` });
      if (!puedeAcceder(data, req)) {
        return res.status(403).send({ message: "No tienes permiso para ver esta venta." });
      }
      const json = data.status === "paid" ? ticketCode.conCodigos(data) : data.toJSON();
      delete json.guestToken;
      res.send(json);
    })
    .catch(err => {
      console.error(`[sales] Error al obtener la venta ${id}:`, err.message);
      res.status(500).send({ message: `Error al obtener la venta con id=${id}: ${err.message}` });
    });
};


// Reenvia por correo las entradas de una venta pagada (dueno o admin)
exports.reenviar = async (req, res) => {
  try {
    const venta = await db.sales.findByPk(req.params.id);
    if (!venta) return res.status(404).send({ message: "Venta no encontrada." });
    if (!puedeAcceder(venta, req)) {
      return res.status(403).send({ message: "No tienes permiso sobre esta venta." });
    }
    if (venta.status !== "paid") {
      return res.status(409).send({ message: "Solo se pueden reenviar entradas de ventas pagadas." });
    }
    if (!mail.configurado()) {
      return res.status(503).send({ message: "El envio de correos no esta configurado en el servidor." });
    }
    await mail.enviarEntradas(venta.id, { forzar: true });
    res.send({ message: "Entradas reenviadas a tu correo." });
  } catch (err) {
    console.error("[sales] Error al reenviar entradas:", err.message);
    res.status(500).send({ message: "No se pudo enviar el correo: " + err.message });
  }
};


// Cancela una venta pendiente y libera los asientos al instante (dueno o admin)
exports.cancelar = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const venta = await db.sales.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!venta) { await t.rollback(); return res.status(404).send({ message: "Venta no encontrada." }); }
    if (!puedeAcceder(venta, req)) {
      await t.rollback();
      return res.status(403).send({ message: "No tienes permiso sobre esta venta." });
    }
    if (venta.status !== "pending") {
      await t.rollback();
      return res.status(409).send({ message: `Solo se pueden cancelar ventas pendientes (estado actual: "${venta.status}").` });
    }

    await db.tickets.destroy({ where: { saleId: venta.id }, transaction: t });
    venta.status = "cancelled";
    await venta.save({ transaction: t });
    await t.commit();

    // Mejor esfuerzo: cancelar el cobro abierto en Stripe
    try {
      const pagos = await db.payments.findAll({ where: { saleId: venta.id, status: "pending" } });
      if (pagos.length && process.env.STRIPE_SECRET_KEY) {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        for (const p of pagos) {
          await stripe.paymentIntents.cancel(p.stripePaymentIntentId).catch(() => {});
          p.status = "failed"; await p.save();
        }
      }
    } catch (e) { console.error("[sales] No se pudo cancelar el payment intent:", e.message); }

    res.send({ message: "Compra cancelada. Los asientos fueron liberados." });
  } catch (err) {
    await t.rollback();
    res.status(500).send({ message: err.message || "Error al cancelar la venta." });
  }
};



// Reembolso total de una venta pagada (solo admin). Online: devuelve el dinero en Stripe. Taquilla: se registra y se devuelve en caja.
exports.reembolsar = async (req, res) => {
  const motivo = String(req.body?.reason || "").trim().slice(0, 200);
  const t = await db.sequelize.transaction();
  try {
    const venta = await db.sales.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!venta) { await t.rollback(); return res.status(404).send({ message: "Venta no encontrada." }); }
    if (venta.status === "refunded") { await t.rollback(); return res.status(409).send({ message: "Esta venta ya fue reembolsada." }); }
    if (venta.status !== "paid") { await t.rollback(); return res.status(409).send({ message: `Solo se reembolsan ventas pagadas (estado actual: "${venta.status}").` }); }

    if (venta.pickedUpAt) {
      await t.rollback();
      return res.status(409).send({ message: "No se puede reembolsar: el pedido de dulceria ya fue entregado." });
    }

    const tickets = await db.tickets.findAll({
      where: { saleId: venta.id },
      include: [db.seats, { model: db.shows, include: [db.movies] }],
      transaction: t
    });
    if (tickets.some(x => x.usedAt)) {
      await t.rollback();
      return res.status(409).send({ message: "No se puede reembolsar: al menos una entrada ya fue usada en la sala." });
    }

    const pago = await db.payments.findOne({ where: { saleId: venta.id, status: "completed" }, order: [["id", "DESC"]], transaction: t });
    let stripeRefundId = null;
    if (pago?.stripePaymentIntentId) {
      if (!process.env.STRIPE_SECRET_KEY) { await t.rollback(); return res.status(503).send({ message: "Stripe no esta configurado en el servidor." }); }
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const r = await stripe.refunds.create(
          { payment_intent: pago.stripePaymentIntentId, metadata: { saleId: String(venta.id) } },
          { idempotencyKey: `refund-sale-${venta.id}` }
        );
        stripeRefundId = r.id;
      } catch (e) {
        if (e.code !== "charge_already_refunded") {
          await t.rollback();
          console.error("[sales] Stripe rechazo el reembolso:", e.message);
          return res.status(502).send({ message: "Stripe no pudo reembolsar: " + e.message });
        }
      }
    }

    const primero = tickets[0];
    let resumen;
    if (venta.kind === "food") {
      const lineas = await db.saleFoodItems.findAll({ where: { saleId: venta.id }, include: [db.foodItems], transaction: t });
      resumen = `Dulceria: ${lineas.map(l => `${l.quantity}x ${l.foodItem?.name}`).join(", ")}`;
    } else {
      resumen = `${primero?.show?.movie?.title ?? "Funcion"} · asientos ${tickets.map(x => `${x.seat.rowLabel}${x.seat.seatNumber}`).join(", ")}`;
    }
    await db.tickets.destroy({ where: { saleId: venta.id }, transaction: t });
    venta.status = "refunded";
    venta.refundedAt = new Date();
    venta.refundAmount = venta.totalAmount;
    venta.refundNote = motivo ? `${resumen} | Motivo: ${motivo}` : resumen;
    await venta.save({ transaction: t });
    if (pago) { pago.status = "refunded"; await pago.save({ transaction: t }); }
    await t.commit();

    mail.enviarReembolso(venta.id).catch(err => console.error("[mail] No se pudo avisar del reembolso:", err.message));

    res.send({
      message: stripeRefundId ? "Reembolso procesado en Stripe." : "Venta reembolsada. Devuelve el dinero en caja.",
      stripeRefundId
    });
  } catch (err) {
    await t.rollback().catch(() => {});
    console.error("[sales] Error al reembolsar:", err.message);
    res.status(500).send({ message: err.message || "Error al reembolsar la venta." });
  }
};
