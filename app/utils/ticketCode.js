// Codigo firmado que lleva el QR de cada entrada: NEBAJPOLIS|V{venta}|T{boleto}|S{asiento}|{firma}
// La firma (HMAC) evita que alguien invente codigos validos.
const crypto = require("crypto");
const config = require("../config/auth.config.js");

const firmar = (saleId, ticketId) =>
  crypto.createHmac("sha256", String(process.env.QR_SECRET || config.secret))
    .update(`${saleId}|${ticketId}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

// La comida no se pierde si el cliente falta a la funcion: su QR vale 6 meses desde la compra
const VIGENCIA_COMIDA_MESES = 6;
exports.venceComida = (venta) => {
  const d = new Date(venta.saleDate || venta.createdAt || Date.now());
  d.setMonth(d.getMonth() + VIGENCIA_COMIDA_MESES);
  return d;
};

// Pedido de dulceria: NEBAJPOLIS|V{venta}|F|{firma}
exports.generarPedido = (saleId) => `NEBAJPOLIS|V${saleId}|F|${firmar(saleId, "F")}`;

exports.generar = (saleId, ticketId, seatId) =>
  `NEBAJPOLIS|V${saleId}|T${ticketId}|S${seatId ?? ""}|${firmar(saleId, ticketId)}`;

// Devuelve { saleId, ticketId } o null si el codigo es invalido
exports.leer = (codigo) => {
  const partes = String(codigo || "").trim().split("|");
  if (partes.length === 4 && partes[0] === "NEBAJPOLIS" && partes[2] === "F") {
    const saleId = parseInt(partes[1].slice(1), 10);
    if (!saleId) return null;
    const esperada = firmar(saleId, "F"), recibida = partes[3].toUpperCase();
    if (esperada.length !== recibida.length || !crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(recibida))) return null;
    return { saleId, pedido: true };
  }
  if (partes.length !== 5 || partes[0] !== "NEBAJPOLIS") return null;
  const saleId = parseInt(partes[1].slice(1), 10);
  const ticketId = parseInt(partes[2].slice(1), 10);
  if (!saleId || !ticketId) return null;
  const esperada = firmar(saleId, ticketId);
  const recibida = partes[4].toUpperCase();
  if (esperada.length !== recibida.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(recibida))) return null;
  return { saleId, ticketId };
};

// Agrega `code` a cada boleto de una venta (objeto plano listo para enviar)
exports.conCodigos = (venta) => {
  const v = venta.toJSON ? venta.toJSON() : venta;
  if (Array.isArray(v.tickets)) {
    v.tickets = v.tickets.map((t) => ({ ...t, code: exports.generar(v.id, t.id, t.seatId) }));
  }
  // QR de comida aparte (pedido solo de dulceria, o comida agregada a una compra de boletos)
  if (v.kind === "food" || (Array.isArray(v.saleFoodItems) && v.saleFoodItems.length > 0)) {
    v.pickupCode = exports.generarPedido(v.id);
    v.foodValidUntil = exports.venceComida(v);
  }
  return v;
};
