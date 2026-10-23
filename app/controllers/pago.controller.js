
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../models");
const mail = require("../services/mail.service.js");
const { puedeAcceder } = require("../utils/saleAccess.js");

// Moneda de cobro. Los precios del sistema estan en quetzales (GTQ).
// Si STRIPE_CURRENCY no es gtq, el monto se convierte con STRIPE_EXCHANGE_RATE (quetzales por 1 unidad de esa moneda).
const MONEDA = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const TASA = parseFloat(process.env.STRIPE_EXCHANGE_RATE || "7.7");
const montoACobrar = (totalQuetzales) => (MONEDA === "gtq" ? totalQuetzales : totalQuetzales / TASA);

// Marca pago y venta como pagados (idempotente) y envia las entradas por correo una sola vez.
async function marcarPagada(paymentIntentId) {
  const payment = await db.payments.findOne({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!payment) {
    console.log("Pago recibido para un payment intent sin registro:", paymentIntentId);
    return null;
  }
  const venta = await db.sales.findByPk(payment.saleId);
  if (payment.status !== "completed") { payment.status = "completed"; await payment.save(); }
  if (venta && venta.status !== "paid") { venta.status = "paid"; await venta.save(); }
  mail.enviarEntradas(payment.saleId).catch(err => console.error("[mail] No se pudo enviar las entradas:", err.message));
  return venta;
}
exports.marcarPagada = marcarPagada;





exports.crearPaymentIntent = async (req, res) => {
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
    if (!puedeAcceder(sale, req)) {
      return res.status(403).send({ message: "No tienes permiso para pagar esta venta." });
    }
    if (sale.status !== "pending") {
      return res.status(409).send({ message: `Esta venta ya se encuentra en estado "${sale.status}".` });
    }

    
    
    const holdMinutes = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);
    const vencidaEn = new Date(sale.saleDate.getTime() + holdMinutes * 60 * 1000);
    if (new Date() > vencidaEn) {
      return res.status(409).send({ message: "El tiempo de reserva de estos asientos ya vencio. Intenta la compra de nuevo." });
    }

    
    const montoEnCentavos = Math.round(montoACobrar(parseFloat(sale.totalAmount)) * 100);


const paymentIntent = await stripe.paymentIntents.create({
  amount: montoEnCentavos,
  currency: MONEDA,
  payment_method_types: ["card"], 
  metadata: { saleId: sale.id.toString() }
});

    
    await db.payments.create({
      saleId: sale.id,
      amount: sale.totalAmount,
      status: "pending",
      stripePaymentIntentId: paymentIntent.id
    });

    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
      chargeAmount: montoEnCentavos / 100,
      chargeCurrency: MONEDA.toUpperCase()
    });
  } catch (error) {
    res.status(500).send({ message: error.message || "Error al crear el Payment Intent." });
  }
};



exports.webhook = (req, res) => {
  const sig = req.headers["stripe-signature"];
  let evento;

  try {
    evento = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (evento.type) {
    case "payment_intent.succeeded": {
      marcarPagada(evento.data.object.id)
        .catch(err => console.log("Error al procesar el webhook de Stripe:", err.message));
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = evento.data.object;

      db.payments.findOne({ where: { stripePaymentIntentId: paymentIntent.id } })
        .then(payment => {
          if (!payment) return;
          payment.status = "failed";
          return payment.save();
        })
        .catch(err => console.log("Error al procesar el webhook de Stripe:", err.message));
      break;
    }
    default:
      console.log(`Evento de Stripe no manejado: ${evento.type}`);
  }

  res.status(200).send({ received: true });
};

// El front lo llama tras confirmar la tarjeta: consulta a Stripe y marca la venta como pagada.
// Evita depender solo del webhook (util en desarrollo sin "stripe listen").
exports.confirmar = async (req, res) => {
  try {
    const { saleId } = req.body;
    if (!saleId) return res.status(400).send({ message: "saleId es requerido." });

    const venta = await db.sales.findByPk(saleId);
    if (!venta) return res.status(404).send({ message: `Venta con id=${saleId} no encontrada.` });
    if (!puedeAcceder(venta, req)) {
      return res.status(403).send({ message: "No tienes permiso sobre esta venta." });
    }
    if (venta.status === "paid") return res.send({ status: "paid" });

    const pago = await db.payments.findOne({ where: { saleId }, order: [["id", "DESC"]] });
    if (!pago || !pago.stripePaymentIntentId) {
      return res.status(404).send({ message: "Esta venta no tiene un pago iniciado." });
    }

    const intent = await stripe.paymentIntents.retrieve(pago.stripePaymentIntentId);
    if (intent.status !== "succeeded") {
      return res.status(409).send({ message: `El pago aun no esta confirmado (estado: ${intent.status}).` });
    }

    await marcarPagada(intent.id);
    res.send({ status: "paid" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Error al confirmar el pago." });
  }
};
