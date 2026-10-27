// Descuentos por cupon y precios de combo. Todo se valida en el servidor.
const db = require("../models");
const { Op } = db.Sequelize;

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const falla = (status, message) => Object.assign(new Error(message), { status });
const normalizarCodigo = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");

/**
 * Evalua un cupon sin modificar nada.
 * base: { subBoletos, subComida }  -> montos antes de descuento
 * devuelve { cupon, descuento, aplicaBoletos, aplicaComida }
 */
async function evaluarCupon({ code, subBoletos = 0, subComida = 0, userId = null, guestEmail = null, t = null }) {
  const codigo = normalizarCodigo(code);
  if (!codigo) throw falla(400, "Escribe el codigo del cupon.");
  const cupon = await db.coupons.findOne({ where: { code: codigo }, ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {}) });
  // mismo mensaje para "no existe" y "inactivo": no se revela que codigos existen
  if (!cupon || !cupon.status) throw falla(400, "El cupon no es valido.");
  const ahora = new Date();
  if (cupon.validFrom && new Date(cupon.validFrom) > ahora) throw falla(400, "El cupon aun no esta vigente.");
  if (cupon.validTo && new Date(cupon.validTo) < ahora) throw falla(400, "El cupon ya vencio.");

  const aplicaBoletos = cupon.appliesTo !== "food";
  const aplicaComida = cupon.appliesTo !== "tickets";
  const base = (aplicaBoletos ? subBoletos : 0) + (aplicaComida ? subComida : 0);
  if (base <= 0) {
    throw falla(400, cupon.appliesTo === "tickets" ? "Este cupon solo aplica a boletos." : "Este cupon solo aplica a dulceria.");
  }
  if (Number(cupon.minAmount) > 0 && base < Number(cupon.minAmount)) {
    throw falla(400, `Este cupon requiere una compra minima de Q${Number(cupon.minAmount).toFixed(2)}.`);
  }

  const usadas = (where) => db.sales.count({ where: { couponId: cupon.id, status: { [Op.in]: ["pending", "paid"] }, ...where }, ...(t ? { transaction: t } : {}) });
  if (cupon.maxUses !== null && cupon.maxUses !== undefined && (await usadas({})) >= cupon.maxUses) {
    throw falla(400, "Este cupon ya alcanzo su limite de usos.");
  }
  if (cupon.perUserLimit !== null && cupon.perUserLimit !== undefined) {
    const quien = userId ? { userId } : guestEmail ? { userId: null, guestEmail } : null;
    if (quien && (await usadas(quien)) >= cupon.perUserLimit) throw falla(400, "Ya usaste este cupon el maximo de veces permitido.");
  }

  let descuento = cupon.type === "fixed" ? Math.min(Number(cupon.value), base) : base * (Number(cupon.value) / 100);
  // El total nunca baja de Q1 (el cobro con tarjeta no admite montos nulos)
  const total = subBoletos + subComida;
  descuento = Math.min(r2(descuento), r2(Math.max(total - 1, 0)));
  if (!(descuento > 0)) throw falla(400, "Este cupon no genera descuento en tu compra.");
  return { cupon, descuento, aplicaBoletos, aplicaComida, base };
}

// Aplica un descuento en proporcion a los precios de boletos (numeros) y lineas de comida {foodItemId, quantity, unitPrice}.
// alcance: { boletos, comida } indica que parte se descuenta. La suma final es EXACTA: la diferencia de centavos
// por redondeo se absorbe en el primer boleto, o (si no hay boletos) en una unidad de comida.
function aplicarDescuento(boletos, comida, descuento, alcance = { boletos: true, comida: true }) {
  const sumB = boletos.reduce((s, p) => s + p, 0);
  const sumC = comida.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const elegible = (alcance.boletos ? sumB : 0) + (alcance.comida ? sumC : 0);
  const salida = { boletos: boletos.map(r2), comida: comida.map((l) => ({ ...l, unitPrice: r2(l.unitPrice) })) };
  if (!(elegible > 0) || !(descuento > 0)) return salida;
  const factor = (elegible - descuento) / elegible;
  if (alcance.boletos) salida.boletos = boletos.map((p) => r2(p * factor));
  if (alcance.comida) salida.comida = comida.map((l) => ({ ...l, unitPrice: r2(l.unitPrice * factor) }));
  const objetivo = r2(sumB + sumC - descuento);
  const real = r2(salida.boletos.reduce((s, p) => s + p, 0) + salida.comida.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const dif = r2(objetivo - real);
  if (dif !== 0) {
    if (alcance.boletos && salida.boletos.length) salida.boletos[0] = r2(salida.boletos[0] + dif);
    else if (alcance.comida && salida.comida.length) {
      const l = salida.comida[0];
      if (l.quantity === 1) l.unitPrice = r2(l.unitPrice + dif);
      else { l.quantity -= 1; salida.comida.splice(1, 0, { ...l, quantity: 1, unitPrice: r2(l.unitPrice + dif) }); }
    }
  }
  return salida;
}

const totalDe = (boletos, comida) => r2(boletos.reduce((s, p) => s + p, 0) + comida.reduce((s, l) => s + l.quantity * l.unitPrice, 0));

module.exports = { evaluarCupon, aplicarDescuento, totalDe, r2, normalizarCodigo, falla };
