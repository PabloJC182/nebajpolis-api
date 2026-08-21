// app/controllers/pago.controller.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../models");

// Crea una sesion de pago de Stripe Checkout a partir de una venta ya creada.
// Body esperado: { saleId }
exports.crearSesion = async (req, res) => {
  try {
    const { saleId } = req.body;
    if (!saleId) {
      return res.status(400).send({ message: "saleId es requerido." });
    }

    const sale = await db.sales.findByPk(saleId, {
      include: [{ model: db.tickets, include: [db.seats, db.shows] }]
    });

    if (!sale) {
      return res.status(404).send({ message: `Venta con id=${saleId} no encontrada.` });
    }
    if (sale.userId !== req.userId) {
      return res.status(403).send({ message: "No tienes permiso para pagar esta venta." });
    }
    if (sale.status !== "pending") {
      return res.status(409).send({ message: `Esta venta ya se encuentra en estado "${sale.status}".` });
    }

    // Doble chequeo por tiempo: cubre el margen de hasta 1 minuto entre que la reserva
    // vence y el job expireSales.job.js la marca como "expired".
    const holdMinutes = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);
    const vencidaEn = new Date(sale.saleDate.getTime() + holdMinutes * 60 * 1000);
    if (new Date() > vencidaEn) {
      return res.status(409).send({ message: "El tiempo de reserva de estos asientos ya vencio. Intenta la compra de nuevo." });
    }

    // Stripe trabaja en la unidad minima de la moneda (centavos)
    const montoEnCentavos = Math.round(parseFloat(sale.totalAmount) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Compra de boletos - Venta #${sale.id}` },
            unit_amount: montoEnCentavos
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${process.env.CORS_ORIGIN}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CORS_ORIGIN}/pago-cancelado`
    });

    // Registramos el intento de pago; el webhook lo actualizara a "completed" cuando Stripe confirme
    await db.payments.create({
      saleId: sale.id,
      amount: sale.totalAmount,
      status: "pending",
      stripeSessionId: session.id
    });

    res.status(200).send({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).send({ message: error.message || "Error al crear la sesion de pago." });
  }
};

// Endpoint llamado directamente por Stripe (no por el frontend). Requiere el body crudo,
// ver la nota en server.js sobre por que se registra antes de bodyParser.json().
exports.webhook = (req, res) => {
  const sig = req.headers["stripe-signature"];
  let evento;

  try {
    evento = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (evento.type) {
    case "checkout.session.completed": {
      const session = evento.data.object;

      db.payments.findOne({ where: { stripeSessionId: session.id } })
        .then(payment => {
          if (!payment) {
            console.log("Webhook recibido para una sesion sin pago registrado:", session.id);
            return;
          }
          payment.status = "completed";
          return payment.save().then(() => {
            return db.sales.update({ status: "paid" }, { where: { id: payment.saleId } });
          });
        })
        .catch(err => console.log("Error al procesar el webhook de Stripe:", err.message));
      break;
    }
    default:
      console.log(`Evento de Stripe no manejado: ${evento.type}`);
  }

  res.status(200).send({ received: true });
};
