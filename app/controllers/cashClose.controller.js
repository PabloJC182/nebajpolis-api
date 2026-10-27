const db = require("../models");
const { registrar } = require("../utils/audit.js");
const TZ = "America/Guatemala";
const q = (sql, replacements) => db.sequelize.query(sql, { replacements, type: db.Sequelize.QueryTypes.SELECT });

const hoyGT = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// El turno empieza en el ultimo cierre del cajero (o a las 00:00 de hoy si nunca ha cerrado)
async function inicioTurno(userId) {
  const ultimo = await db.cashCloses.findOne({ where: { userId }, order: [["closedAt", "DESC"]] });
  return ultimo ? new Date(ultimo.closedAt) : new Date(`${hoyGT()}T00:00:00-06:00`);
}

// Lo que DEBERIA haber en caja: cobros de taquilla del cajero en el turno, menos reembolsos devueltos en el turno
async function esperado(userId, desde, hasta) {
  const [entra] = await q(`
    SELECT COUNT(DISTINCT s.id)::int AS "ventas",
           COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'cash'), 0)::float AS "efectivo",
           COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'pos'), 0)::float AS "pos"
    FROM sales s JOIN payments p ON p."saleId" = s.id AND p.status IN ('completed', 'refunded')
    WHERE s.channel = 'box_office' AND s."soldBy" = :uid AND s."saleDate" > :desde AND s."saleDate" <= :hasta`, { uid: userId, desde, hasta });
  const [sale] = await q(`
    SELECT COUNT(*)::int AS "reembolsos",
           COALESCE(SUM(s."refundAmount") FILTER (WHERE p.method = 'cash'), 0)::float AS "efectivo",
           COALESCE(SUM(s."refundAmount") FILTER (WHERE p.method = 'pos'), 0)::float AS "pos"
    FROM sales s JOIN payments p ON p."saleId" = s.id
    WHERE s.channel = 'box_office' AND s."soldBy" = :uid AND s.status = 'refunded' AND s."refundedAt" > :desde AND s."refundedAt" <= :hasta`, { uid: userId, desde, hasta });
  return {
    ventas: entra.ventas, reembolsos: sale.reembolsos,
    cobradoEfectivo: r2(entra.efectivo), cobradoPos: r2(entra.pos),
    devueltoEfectivo: r2(sale.efectivo), devueltoPos: r2(sale.pos),
    efectivo: r2(entra.efectivo - sale.efectivo), pos: r2(entra.pos - sale.pos),
  };
}

// GET /api/cierres/turno  (taquilla): cierre "ciego": solo se dice desde cuando y cuantas ventas, NO cuanto deberia haber
exports.turno = async (req, res) => {
  try {
    const desde = await inicioTurno(req.userId);
    const e = await esperado(req.userId, desde, new Date());
    res.send({ desde, ventas: e.ventas, reembolsos: e.reembolsos });
  } catch (err) { res.status(500).send({ message: err.message || "Error al consultar el turno." }); }
};

// POST /api/cierres { countedCash, countedPos, note }  (taquilla)
exports.cerrar = async (req, res) => {
  const num = (v) => (v === undefined || v === null || v === "" ? 0 : Number(v));
  const contadoEfectivo = r2(num(req.body.countedCash));
  const contadoPos = r2(num(req.body.countedPos));
  const nota = String(req.body.note || "").trim().slice(0, 500);
  for (const v of [contadoEfectivo, contadoPos]) {
    if (!Number.isFinite(v) || v < 0 || v > 10000000) return res.status(400).send({ message: "Los montos contados deben ser numeros de cero en adelante." });
  }
  try {
    const desde = await inicioTurno(req.userId);
    const hasta = new Date();
    const e = await esperado(req.userId, desde, hasta);
    const difE = r2(contadoEfectivo - e.efectivo);
    const difP = r2(contadoPos - e.pos);
    if ((Math.abs(difE) >= 0.01 || Math.abs(difP) >= 0.01) && !nota) {
      return res.status(400).send({ message: "Lo que contaste no coincide con lo que el sistema esperaba. Cuenta de nuevo; si es correcto, explica el motivo en la nota y vuelve a cerrar.", hayDiferencia: true });
    }
    const cierre = await db.cashCloses.create({
      userId: req.userId, sinceAt: desde, closedAt: hasta, salesCount: e.ventas,
      expectedCash: e.efectivo, expectedPos: e.pos, countedCash: contadoEfectivo, countedPos: contadoPos,
      diffCash: difE, diffPos: difP, note: nota || null,
    });
    registrar(req, {
      action: "cerrar_caja", entity: "cierres", entityId: cierre.id,
      summary: `Cerró caja: ${e.ventas} venta(s) · efectivo contado Q${contadoEfectivo.toFixed(2)} (esperado Q${e.efectivo.toFixed(2)}, dif. ${difE >= 0 ? "+" : ""}${difE.toFixed(2)}) · POS contado Q${contadoPos.toFixed(2)} (esperado Q${e.pos.toFixed(2)}, dif. ${difP >= 0 ? "+" : ""}${difP.toFixed(2)})${nota ? ` · ${nota}` : ""}`,
      meta: { ...e, contadoEfectivo, contadoPos, difE, difP },
    });
    res.send({ ...cierre.toJSON(), detalle: e });
  } catch (err) { res.status(500).send({ message: err.message || "Error al cerrar la caja." }); }
};

// GET /api/cierres?desde=&hasta=&cajeroId=  (taquilla: solo los suyos; analista/admin: todos)
exports.listar = async (req, res) => {
  const hasta = esFecha(req.query.hasta) ? req.query.hasta : hoyGT();
  const base = new Date(`${hasta}T12:00:00Z`); base.setUTCDate(base.getUTCDate() - 29);
  const desde = esFecha(req.query.desde) ? req.query.desde : base.toISOString().slice(0, 10);
  const cajeroId = req.userRole === "taquilla" ? req.userId : (parseInt(req.query.cajeroId, 10) || null);
  try {
    const items = await q(`
      SELECT c.id, c."userId", u."fullName" AS "cajero", c."sinceAt", c."closedAt", c."salesCount",
             c."expectedCash"::float, c."expectedPos"::float, c."countedCash"::float, c."countedPos"::float,
             c."diffCash"::float, c."diffPos"::float, c.note
      FROM "cashCloses" c JOIN "appUsers" u ON u.id = c."userId"
      WHERE (c."closedAt" AT TIME ZONE '${TZ}')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
        AND (CAST(:cajeroId AS int) IS NULL OR c."userId" = CAST(:cajeroId AS int))
      ORDER BY c."closedAt" DESC LIMIT 300`, { desde, hasta, cajeroId });
    res.send({ desde, hasta, items });
  } catch (err) { res.status(500).send({ message: err.message || "Error al listar los cierres." }); }
};
