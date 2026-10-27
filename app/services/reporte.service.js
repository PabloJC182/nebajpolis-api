// Arma y envia el reporte programado (diario / semanal) por correo
const db = require("../models");
const mail = require("./mail.service.js");
const rep = require("../controllers/report.controller.js");
const inv = require("../controllers/inventory.controller.js");
const { hoyGT, sumarDias } = rep.utilFechas;

const fechaLocal = (d) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Guatemala" }) : null);
const diaSemana = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = domingo

// Lunes mas reciente (hoy incluido)
const ultimoLunes = (hoy) => sumarDias(hoy, -((diaSemana(hoy) + 6) % 7));

// Periodo que cubre el reporte. Semanal: lunes a domingo anteriores; diario: ayer.
const periodo = (frecuencia, hoy = hoyGT(), { ultimos7 = false } = {}) => {
  if (frecuencia === "daily") { const ayer = sumarDias(hoy, -1); return { desde: ayer, hasta: ayer, etiqueta: "diario" }; }
  if (ultimos7) return { desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, -1), etiqueta: "semanal" };
  const lunes = ultimoLunes(hoy);
  return { desde: sumarDias(lunes, -7), hasta: sumarDias(lunes, -1), etiqueta: "semanal" };
};

// ¿Toca enviar? (a partir de las 7:00 de Guatemala; si el servidor estuvo apagado, se pone al dia)
const toca = (s, ahora = new Date()) => {
  if (!s.active) return false;
  const hoy = fechaLocal(ahora);
  const hora = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/Guatemala", hour: "numeric", hour12: false }).format(ahora), 10) % 24;
  const ultimo = fechaLocal(s.lastSentAt) ?? "0000-00-00";
  if (s.frequency === "daily") return ultimo < hoy && hora >= 7;
  const lunes = ultimoLunes(hoy);
  return ultimo < lunes && (hoy > lunes || hora >= 7);
};

async function datos(desde, hasta) {
  const resumen = await rep.calcularResumen({ desde, hasta, cineId: null, peliculaId: null, canal: null, tipo: null });
  const stockBajo = await inv.stockBajo();
  const cierres = await db.sequelize.query(`
    SELECT c.*, u."fullName" AS "cajero" FROM "cashCloses" c JOIN "appUsers" u ON u.id = c."userId"
    WHERE (c."closedAt" AT TIME ZONE 'America/Guatemala')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
      AND (c."diffCash" <> 0 OR c."diffPos" <> 0) ORDER BY c."closedAt"`,
    { replacements: { desde, hasta }, type: db.Sequelize.QueryTypes.SELECT });
  return { resumen, stockBajo, cierres };
}

async function enviarSchedule(s, rango = periodo(s.frequency)) {
  const d = await datos(rango.desde, rango.hasta);
  const r = await mail.enviarReporte(s.email, rango, d);
  if (r && r.enviado === false) throw new Error(r.motivo || "El correo no se pudo enviar.");
  return rango;
}

module.exports = { periodo, toca, enviarSchedule, datos, ultimoLunes };
