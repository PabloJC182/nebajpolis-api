const db = require("../models");
const q = (sql, replacements) => db.sequelize.query(sql, { replacements, type: db.Sequelize.QueryTypes.SELECT });
const TZ = "America/Guatemala";

const hoyGT = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const entero = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// Filtros comunes: desde/hasta (dia en hora de Guatemala, por defecto ultimos 30 dias), cineId, peliculaId, canal, tipo
function filtros(req) {
  const hasta = esFecha(req.query.hasta) ? req.query.hasta : hoyGT();
  const desde = esFecha(req.query.desde) ? req.query.desde : sumarDias(hasta, -29);
  if (desde > hasta) throw Object.assign(new Error("La fecha inicial no puede ser mayor que la final."), { status: 400 });
  if ((new Date(hasta) - new Date(desde)) / 864e5 > 731) throw Object.assign(new Error("El rango maximo es de 2 anios."), { status: 400 });
  return {
    desde, hasta,
    cineId: entero(req.query.cineId),
    peliculaId: entero(req.query.peliculaId),
    canal: ["online", "box_office"].includes(req.query.canal) ? req.query.canal : null,
    tipo: ["tickets", "food"].includes(req.query.tipo) ? req.query.tipo : null,
  };
}

// Ventas pagadas del periodo con su cine (el de la funcion, o el de recogida en pedidos solo de comida)
const CTE_VENTAS = (campoFecha = `s."saleDate"`, estado = "paid") => `
  WITH v AS (
    SELECT s.*,
      (${campoFecha} AT TIME ZONE '${TZ}')::date AS dia,
      COALESCE(s."pickupCinemaId", (SELECT r."cinemaId" FROM tickets t JOIN shows sh ON sh.id = t."showId" JOIN rooms r ON r.id = sh."roomId" WHERE t."saleId" = s.id LIMIT 1)) AS "cineId"
    FROM sales s
    WHERE s.status = '${estado}'
      AND (${campoFecha} AT TIME ZONE '${TZ}')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
      AND (CAST(:canal AS text) IS NULL OR s.channel = CAST(:canal AS text))
      AND (CAST(:tipo AS text) IS NULL OR s.kind = CAST(:tipo AS text))
  ), vf AS (
    SELECT v.* FROM v
    WHERE (CAST(:cineId AS int) IS NULL OR v."cineId" = CAST(:cineId AS int))
      AND (CAST(:peliculaId AS int) IS NULL OR EXISTS (SELECT 1 FROM tickets t JOIN shows sh ON sh.id = t."showId" WHERE t."saleId" = v.id AND sh."movieId" = CAST(:peliculaId AS int)))
  )`;

// Calcula todo el resumen del periodo (lo usan el endpoint, la llave de datos y el correo programado)
async function calcularResumen(f) {
    const base = CTE_VENTAS();

    const [kpi] = await q(`${base}
      SELECT COUNT(*)::int AS "ventas",
             COALESCE(SUM(vf."totalAmount"), 0)::float AS "ingresos",
             COALESCE(SUM((SELECT SUM(t.price) FROM tickets t WHERE t."saleId" = vf.id)), 0)::float AS "ingresosBoletos",
             COALESCE(SUM((SELECT SUM(sf.quantity * sf."unitPrice") FROM "saleFoodItems" sf WHERE sf."saleId" = vf.id)), 0)::float AS "ingresosComida",
             COALESCE(SUM((SELECT COUNT(*) FROM tickets t WHERE t."saleId" = vf.id)), 0)::int AS "boletos",
             COUNT(*) FILTER (WHERE vf.kind = 'tickets')::int AS "ventasBoletos",
             COUNT(*) FILTER (WHERE vf.kind = 'tickets' AND EXISTS (SELECT 1 FROM "saleFoodItems" sf WHERE sf."saleId" = vf.id))::int AS "ventasBoletosConComida",
             COUNT(*) FILTER (WHERE vf.kind = 'food')::int AS "pedidosDulceria"
      FROM vf`, f);

    const [uso] = await q(`${base}
      SELECT COUNT(*) FILTER (WHERE t."usedAt" IS NOT NULL)::int AS "usados",
             COUNT(*) FILTER (WHERE t."usedAt" IS NULL AND sh."showDatetime" < NOW())::int AS "noShow",
             COALESCE(SUM(GREATEST(sh."basePrice" - t.price, 0)), 0)::float AS "descuentos"
      FROM vf JOIN tickets t ON t."saleId" = vf.id JOIN shows sh ON sh.id = t."showId"`, f);

    const [reem] = await q(`${CTE_VENTAS(`s."refundedAt"`, "refunded")}
      SELECT COUNT(*)::int AS "reembolsos", COALESCE(SUM(vf."refundAmount"), 0)::float AS "monto" FROM vf`, f);

    const porDia = await q(`${base}
      SELECT to_char(d::date, 'YYYY-MM-DD') AS "dia", COALESCE(x."ventas", 0)::int AS "ventas",
             COALESCE(x."ingresos", 0)::float AS "ingresos", COALESCE(x."boletos", 0)::int AS "boletos"
      FROM generate_series(CAST(:desde AS date), CAST(:hasta AS date), INTERVAL '1 day') d
      LEFT JOIN (SELECT vf.dia, COUNT(*) AS "ventas", SUM(vf."totalAmount") AS "ingresos",
                        SUM((SELECT COUNT(*) FROM tickets t WHERE t."saleId" = vf.id)) AS "boletos"
                 FROM vf GROUP BY vf.dia) x ON x.dia = d::date
      ORDER BY d`, f);

    const porPelicula = await q(`${base}
      SELECT m.id, m.title, COUNT(t.id)::int AS "boletos", COALESCE(SUM(t.price), 0)::float AS "ingresos"
      FROM vf JOIN tickets t ON t."saleId" = vf.id JOIN shows sh ON sh.id = t."showId" JOIN movies m ON m.id = sh."movieId"
      WHERE (CAST(:peliculaId AS int) IS NULL OR m.id = CAST(:peliculaId AS int))
      GROUP BY m.id, m.title ORDER BY "boletos" DESC, "ingresos" DESC LIMIT 15`, f);

    const porCine = await q(`${base}
      SELECT c.id, c.name, COUNT(*)::int AS "ventas", COALESCE(SUM(vf."totalAmount"), 0)::float AS "ingresos"
      FROM vf JOIN cinemas c ON c.id = vf."cineId" GROUP BY c.id, c.name ORDER BY "ingresos" DESC`, f);

    // Horarios fuertes: boletos por dia de la semana (0 = domingo) y hora de la funcion
    const porHorario = await q(`${base}
      SELECT EXTRACT(DOW FROM sh."showDatetime" AT TIME ZONE '${TZ}')::int AS "dow",
             EXTRACT(HOUR FROM sh."showDatetime" AT TIME ZONE '${TZ}')::int AS "hora", COUNT(*)::int AS "boletos"
      FROM vf JOIN tickets t ON t."saleId" = vf.id JOIN shows sh ON sh.id = t."showId" GROUP BY 1, 2 ORDER BY 1, 2`, f);

    const comida = await q(`${base}
      SELECT fi.name, SUM(sf.quantity)::int AS "unidades", SUM(sf.quantity * sf."unitPrice")::float AS "ingresos"
      FROM vf JOIN "saleFoodItems" sf ON sf."saleId" = vf.id JOIN "foodItems" fi ON fi.id = sf."foodItemId"
      GROUP BY fi.name ORDER BY "ingresos" DESC LIMIT 15`, f);

    const promociones = await q(`${base}
      SELECT p.id, p.name, COUNT(DISTINCT vf.id)::int AS "usos", COUNT(t.id)::int AS "boletos",
             COALESCE(SUM(t.price), 0)::float AS "ingresos",
             COALESCE(SUM(GREATEST(sh."basePrice" - t.price, 0)), 0)::float AS "descuento",
             COALESCE(AVG(t.price), 0)::float AS "precioPromedio"
      FROM vf JOIN promotions p ON p.id = vf."promotionId" JOIN tickets t ON t."saleId" = vf.id JOIN shows sh ON sh.id = t."showId"
      GROUP BY p.id, p.name ORDER BY "boletos" DESC`, f);

    // Referencia para medir efectividad: ventas de boletos sin promocion en el mismo periodo
    const [sinPromo] = await q(`${base}
      SELECT COUNT(DISTINCT vf.id)::int AS "ventas", COUNT(t.id)::int AS "boletos",
             COALESCE(SUM(t.price), 0)::float AS "ingresos", COALESCE(AVG(t.price), 0)::float AS "precioPromedio"
      FROM vf JOIN tickets t ON t."saleId" = vf.id WHERE vf."promotionId" IS NULL`, f);

    const canales = await q(`${base}
      SELECT CASE WHEN vf.channel = 'box_office' THEN 'Taquilla' WHEN vf."userId" IS NULL THEN 'Web (invitado)' ELSE 'Web (con cuenta)' END AS "canal",
             COUNT(*)::int AS "ventas", COALESCE(SUM(vf."totalAmount"), 0)::float AS "ingresos"
      FROM vf GROUP BY 1 ORDER BY "ingresos" DESC`, f);

    // Ocupacion de las funciones del periodo (por fecha de la funcion)
    const ocupacion = await q(`
      SELECT sh.id, m.title, sh."showDatetime", r.name AS "sala", c.name AS "cine",
             (SELECT COUNT(*)::int FROM seats s WHERE s."roomId" = r.id) AS "capacidad",
             (SELECT COUNT(*)::int FROM tickets t JOIN sales s ON s.id = t."saleId" AND s.status = 'paid' WHERE t."showId" = sh.id) AS "vendidos"
      FROM shows sh JOIN movies m ON m.id = sh."movieId" JOIN rooms r ON r.id = sh."roomId" JOIN cinemas c ON c.id = r."cinemaId"
      WHERE (sh."showDatetime" AT TIME ZONE '${TZ}')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
        AND (CAST(:cineId AS int) IS NULL OR c.id = CAST(:cineId AS int))
        AND (CAST(:peliculaId AS int) IS NULL OR m.id = CAST(:peliculaId AS int))
      ORDER BY sh."showDatetime"`, f);
    const conCap = ocupacion.filter((o) => o.capacidad > 0);
    const ocupacionPromedio = conCap.length ? conCap.reduce((s, o) => s + o.vendidos / o.capacidad, 0) / conCap.length : 0;

    // Comida cobrada y aun sin canjear (el QR vale 6 meses desde la compra). No depende del periodo.
    const [pendiente] = await q(`
      SELECT COUNT(*) FILTER (WHERE s."saleDate" + INTERVAL '6 months' >= NOW())::int AS "pedidos",
             COALESCE(SUM((SELECT SUM(sf.quantity * sf."unitPrice") FROM "saleFoodItems" sf WHERE sf."saleId" = s.id)) FILTER (WHERE s."saleDate" + INTERVAL '6 months' >= NOW()), 0)::float AS "monto",
             COUNT(*) FILTER (WHERE s."saleDate" + INTERVAL '6 months' < NOW())::int AS "vencidos",
             COALESCE(SUM((SELECT SUM(sf.quantity * sf."unitPrice") FROM "saleFoodItems" sf WHERE sf."saleId" = s.id)) FILTER (WHERE s."saleDate" + INTERVAL '6 months' < NOW()), 0)::float AS "montoVencido"
      FROM sales s WHERE s.status = 'paid' AND s."pickedUpAt" IS NULL AND EXISTS (SELECT 1 FROM "saleFoodItems" sf WHERE sf."saleId" = s.id)`, {});

    // Embudo aproximado: ventas iniciadas en el periodo por estado
    const embudo = await q(`
      SELECT s.status, COUNT(*)::int AS "total" FROM sales s
      WHERE (s."saleDate" AT TIME ZONE '${TZ}')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
        AND s.channel = 'online' GROUP BY s.status`, f);

    const [dcto] = await q(`${base} SELECT COALESCE(SUM(vf."discountAmount"), 0)::float AS "total" FROM vf`, f);

    const cupones = await q(`${base}
      SELECT c.id, c.code, COUNT(*)::int AS "usos", COALESCE(SUM(vf."discountAmount"), 0)::float AS "descuento", COALESCE(SUM(vf."totalAmount"), 0)::float AS "ingresos"
      FROM vf JOIN coupons c ON c.id = vf."couponId" GROUP BY c.id, c.code ORDER BY "usos" DESC`, f);

    const combos = await q(`${base}
      SELECT c.id, c.name, COUNT(*)::int AS "ventas", COALESCE(SUM(vf."totalAmount"), 0)::float AS "ingresos", COALESCE(SUM(vf."discountAmount"), 0)::float AS "descuento"
      FROM vf JOIN combos c ON c.id = vf."comboId" GROUP BY c.id, c.name ORDER BY "ventas" DESC`, f);

    return {
      filtros: f,
      kpi: {
        ...kpi, ...uso, descuentosCuponesCombos: dcto.total,
        ticketPromedio: kpi.ventas ? kpi.ingresos / kpi.ventas : 0,
        porcentajeConComida: kpi.ventasBoletos ? kpi.ventasBoletosConComida / kpi.ventasBoletos : 0,
        reembolsos: reem.reembolsos, montoReembolsado: reem.monto,
        ocupacionPromedio, funciones: ocupacion.length,
      },
      porDia, porPelicula, porCine, porHorario, comida, promociones, sinPromo, canales,
      ocupacion: ocupacion.map((o) => ({ ...o, porcentaje: o.capacidad ? o.vendidos / o.capacidad : 0 })),
      comidaPendiente: pendiente, embudo, cupones, combos,
    };
}

// GET /api/reportes/resumen  (admin, analista)
exports.resumen = async (req, res) => {
  try {
    res.send(await calcularResumen(filtros(req)));
  } catch (err) {
    if (err.status) return res.status(err.status).send({ message: err.message });
    console.error("[reportes] Error:", err.message);
    res.status(500).send({ message: "Error al generar el reporte: " + err.message });
  }
};
exports.calcularResumen = calcularResumen;
exports.utilFechas = { hoyGT, sumarDias };

// ---------- Exportacion CSV ----------
// Una celda que empieza con = + - @ se interpretaria como formula en Excel: se neutraliza
const celda = (v) => {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const aCsv = (cols, filas) => "﻿" + [cols.map((c) => c.titulo).join(","), ...filas.map((f) => cols.map((c) => celda(f[c.campo])).join(","))].join("\r\n") + "\r\n";

// OJO: sin ":" dentro del texto SQL, Sequelize lo tomaria por un parametro con nombre
const FECHA = (campo) => `(to_char(${campo} AT TIME ZONE '${TZ}', 'YYYY-MM-DD HH24') || chr(58) || to_char(${campo} AT TIME ZONE '${TZ}', 'MI'))`;

const EXPORTES = {
  ventas: {
    cols: (pii) => [
      { titulo: "venta", campo: "id" }, { titulo: "fecha", campo: "fecha" }, { titulo: "tipo", campo: "tipo" }, { titulo: "canal", campo: "canal" },
      { titulo: "metodo_pago", campo: "metodo" }, { titulo: "cine", campo: "cine" }, { titulo: "cajero", campo: "cajero" },
      { titulo: "boletos", campo: "boletos" }, { titulo: "comida", campo: "comida" }, { titulo: "total", campo: "total" }, { titulo: "entregado_comida", campo: "entregado" },
      ...(pii ? [{ titulo: "cliente", campo: "cliente" }, { titulo: "correo", campo: "correo" }] : []),
    ],
    sql: (pii) => `${CTE_VENTAS()}
      SELECT vf.id, ${FECHA(`vf."saleDate"`)} AS "fecha",
        CASE vf.kind WHEN 'food' THEN 'Dulceria' ELSE 'Boletos' END AS "tipo",
        CASE vf.channel WHEN 'box_office' THEN 'Taquilla' ELSE 'Web' END AS "canal",
        COALESCE((SELECT p.method FROM payments p WHERE p."saleId" = vf.id LIMIT 1), '') AS "metodo",
        (SELECT c.name FROM cinemas c WHERE c.id = vf."cineId") AS "cine",
        (SELECT u."fullName" FROM "appUsers" u WHERE u.id = vf."soldBy") AS "cajero",
        (SELECT COUNT(*)::int FROM tickets t WHERE t."saleId" = vf.id) AS "boletos",
        COALESCE((SELECT string_agg(sf.quantity || 'x ' || fi.name, '; ') FROM "saleFoodItems" sf JOIN "foodItems" fi ON fi.id = sf."foodItemId" WHERE sf."saleId" = vf.id), '') AS "comida",
        vf."totalAmount"::float AS "total",
        CASE WHEN vf."pickedUpAt" IS NOT NULL THEN ${FECHA(`vf."pickedUpAt"`)} ELSE '' END AS "entregado"
        ${pii ? `, COALESCE((SELECT u."fullName" FROM "appUsers" u WHERE u.id = vf."userId"), vf."guestName", '') AS "cliente",
                 COALESCE((SELECT u.email FROM "appUsers" u WHERE u.id = vf."userId"), vf."guestEmail", '') AS "correo"` : ""}
      FROM vf ORDER BY vf."saleDate"`,
  },
  boletos: {
    cols: () => [
      { titulo: "boleto", campo: "id" }, { titulo: "venta", campo: "venta" }, { titulo: "fecha_venta", campo: "fechaVenta" },
      { titulo: "pelicula", campo: "pelicula" }, { titulo: "cine", campo: "cine" }, { titulo: "sala", campo: "sala" },
      { titulo: "funcion", campo: "funcion" }, { titulo: "formato", campo: "formato" }, { titulo: "asiento", campo: "asiento" },
      { titulo: "precio_base", campo: "base" }, { titulo: "precio_pagado", campo: "precio" }, { titulo: "canal", campo: "canal" }, { titulo: "usado", campo: "usado" },
    ],
    sql: () => `${CTE_VENTAS()}
      SELECT t.id, vf.id AS "venta", ${FECHA(`vf."saleDate"`)} AS "fechaVenta", m.title AS "pelicula", c.name AS "cine", r.name AS "sala",
        ${FECHA(`sh."showDatetime"`)} AS "funcion", COALESCE(sh.format, '') AS "formato", se."rowLabel" || se."seatNumber" AS "asiento",
        sh."basePrice"::float AS "base", t.price::float AS "precio",
        CASE vf.channel WHEN 'box_office' THEN 'Taquilla' ELSE 'Web' END AS "canal",
        CASE WHEN t."usedAt" IS NOT NULL THEN 'Si' ELSE 'No' END AS "usado"
      FROM vf JOIN tickets t ON t."saleId" = vf.id JOIN shows sh ON sh.id = t."showId" JOIN movies m ON m.id = sh."movieId"
      JOIN rooms r ON r.id = sh."roomId" JOIN cinemas c ON c.id = r."cinemaId" JOIN seats se ON se.id = t."seatId"
      WHERE (CAST(:peliculaId AS int) IS NULL OR m.id = CAST(:peliculaId AS int))
      ORDER BY vf."saleDate", t.id`,
  },
  comida: {
    cols: () => [
      { titulo: "venta", campo: "venta" }, { titulo: "fecha", campo: "fecha" }, { titulo: "producto", campo: "producto" }, { titulo: "categoria", campo: "categoria" },
      { titulo: "cantidad", campo: "cantidad" }, { titulo: "precio_unitario", campo: "unitario" }, { titulo: "importe", campo: "importe" },
      { titulo: "tipo_venta", campo: "tipo" }, { titulo: "canal", campo: "canal" }, { titulo: "cine", campo: "cine" },
    ],
    sql: () => `${CTE_VENTAS()}
      SELECT vf.id AS "venta", ${FECHA(`vf."saleDate"`)} AS "fecha", fi.name AS "producto", COALESCE(fi.category, '') AS "categoria",
        sf.quantity AS "cantidad", sf."unitPrice"::float AS "unitario", (sf.quantity * sf."unitPrice")::float AS "importe",
        CASE vf.kind WHEN 'food' THEN 'Solo dulceria' ELSE 'Con boletos' END AS "tipo",
        CASE vf.channel WHEN 'box_office' THEN 'Taquilla' ELSE 'Web' END AS "canal",
        (SELECT c.name FROM cinemas c WHERE c.id = vf."cineId") AS "cine"
      FROM vf JOIN "saleFoodItems" sf ON sf."saleId" = vf.id JOIN "foodItems" fi ON fi.id = sf."foodItemId"
      ORDER BY vf."saleDate", sf.id`,
  },
  funciones: {
    cols: () => [
      { titulo: "funcion", campo: "id" }, { titulo: "fecha_funcion", campo: "fecha" }, { titulo: "pelicula", campo: "pelicula" }, { titulo: "cine", campo: "cine" },
      { titulo: "sala", campo: "sala" }, { titulo: "formato", campo: "formato" }, { titulo: "capacidad", campo: "capacidad" }, { titulo: "vendidos", campo: "vendidos" },
      { titulo: "ocupacion_pct", campo: "ocupacion" }, { titulo: "ingresos_boletos", campo: "ingresos" },
    ],
    sql: () => `
      SELECT sh.id, ${FECHA(`sh."showDatetime"`)} AS "fecha", m.title AS "pelicula", c.name AS "cine", r.name AS "sala", COALESCE(sh.format, '') AS "formato",
        (SELECT COUNT(*)::int FROM seats s WHERE s."roomId" = r.id) AS "capacidad",
        (SELECT COUNT(*)::int FROM tickets t JOIN sales s ON s.id = t."saleId" AND s.status = 'paid' WHERE t."showId" = sh.id) AS "vendidos",
        ROUND(100.0 * (SELECT COUNT(*) FROM tickets t JOIN sales s ON s.id = t."saleId" AND s.status = 'paid' WHERE t."showId" = sh.id)
          / NULLIF((SELECT COUNT(*) FROM seats s WHERE s."roomId" = r.id), 0), 1)::float AS "ocupacion",
        COALESCE((SELECT SUM(t.price) FROM tickets t JOIN sales s ON s.id = t."saleId" AND s.status = 'paid' WHERE t."showId" = sh.id), 0)::float AS "ingresos"
      FROM shows sh JOIN movies m ON m.id = sh."movieId" JOIN rooms r ON r.id = sh."roomId" JOIN cinemas c ON c.id = r."cinemaId"
      WHERE (sh."showDatetime" AT TIME ZONE '${TZ}')::date BETWEEN CAST(:desde AS date) AND CAST(:hasta AS date)
        AND (CAST(:cineId AS int) IS NULL OR c.id = CAST(:cineId AS int))
        AND (CAST(:peliculaId AS int) IS NULL OR m.id = CAST(:peliculaId AS int))
      ORDER BY sh."showDatetime"`,
  },
};

// GET /api/reportes/exportar/:tipo.csv  (admin, analista). Los datos personales (nombre/correo) solo salen para el admin con ?pii=1
exports.exportar = async (req, res) => {
  const def = EXPORTES[req.params.tipo];
  if (!def) return res.status(404).send({ message: `Tipo de exportacion invalido. Opciones: ${Object.keys(EXPORTES).join(", ")}.` });
  try {
    const f = filtros(req);
    const pii = req.userRole === "admin" && req.query.pii === "1" && !req.apiKeyId;
    const filas = await q(def.sql(pii), f);
    if (pii) require("../utils/audit.js").registrar(req, { action: "exportar_pii", entity: "reportes", entityId: req.params.tipo, summary: `Exportó ${req.params.tipo}.csv CON datos personales (${f.desde} a ${f.hasta}, ${filas.length} filas)` });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Disposition", `attachment; filename="nebajpolis-${req.params.tipo}-${f.desde}_a_${f.hasta}.csv"`);
    res.send(aCsv(def.cols(pii), filas));
  } catch (err) {
    if (err.status) return res.status(err.status).send({ message: err.message });
    console.error("[reportes] Error al exportar:", err.message);
    res.status(500).send({ message: "Error al exportar: " + err.message });
  }
};

// GET /api/reportes/corte-caja?fecha=&cajeroId=  (admin, analista: todos; taquilla: solo su propio corte)
exports.corteCaja = async (req, res) => {
  const fecha = esFecha(req.query.fecha) ? req.query.fecha : hoyGT();
  const cajeroId = req.userRole === "taquilla" ? req.userId : entero(req.query.cajeroId);
  try {
    const cajeros = await q(`
      SELECT u.id, u."fullName" AS "nombre",
        COUNT(DISTINCT s.id)::int AS "ventas",
        COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'cash'), 0)::float AS "efectivo",
        COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'pos'), 0)::float AS "pos",
        COALESCE(SUM(s."totalAmount"), 0)::float AS "total",
        COALESCE(SUM((SELECT COUNT(*) FROM tickets t WHERE t."saleId" = s.id)), 0)::int AS "boletos",
        COALESCE(SUM((SELECT SUM(sf.quantity) FROM "saleFoodItems" sf WHERE sf."saleId" = s.id)), 0)::int AS "productos"
      FROM sales s JOIN "appUsers" u ON u.id = s."soldBy" LEFT JOIN payments p ON p."saleId" = s.id AND p.status = 'completed'
      WHERE s.channel = 'box_office' AND s.status = 'paid'
        AND (s."saleDate" AT TIME ZONE '${TZ}')::date = CAST(:fecha AS date)
        AND (CAST(:cajeroId AS int) IS NULL OR s."soldBy" = CAST(:cajeroId AS int))
      GROUP BY u.id, u."fullName" ORDER BY u."fullName"`, { fecha, cajeroId });
    const reembolsos = await q(`
      SELECT s."soldBy" AS "id", COUNT(*)::int AS "cantidad", COALESCE(SUM(s."refundAmount"), 0)::float AS "monto"
      FROM sales s WHERE s.channel = 'box_office' AND s.status = 'refunded'
        AND (s."refundedAt" AT TIME ZONE '${TZ}')::date = CAST(:fecha AS date)
        AND (CAST(:cajeroId AS int) IS NULL OR s."soldBy" = CAST(:cajeroId AS int))
      GROUP BY s."soldBy"`, { fecha, cajeroId });
    // Un cajero que solo tuvo reembolsos ese dia tambien aparece (con ventas en cero)
    const soloReembolso = reembolsos.filter((r) => !cajeros.some((c) => c.id === r.id));
    const nombres = soloReembolso.length
      ? await q(`SELECT u.id, u."fullName" AS "nombre" FROM "appUsers" u WHERE u.id IN (:ids)`, { ids: soloReembolso.map((r) => r.id) })
      : [];
    const todos = [
      ...cajeros,
      ...soloReembolso.map((r) => ({ id: r.id, nombre: nombres.find((n) => n.id === r.id)?.nombre ?? `Usuario ${r.id}`, ventas: 0, efectivo: 0, pos: 0, total: 0, boletos: 0, productos: 0 })),
    ].sort((x, y) => String(x.nombre).localeCompare(String(y.nombre)));
    const lista = todos.map((c) => {
      const r = reembolsos.find((x) => x.id === c.id);
      return { ...c, reembolsos: r?.cantidad ?? 0, montoReembolsos: r?.monto ?? 0 };
    });
    const suma = (k) => lista.reduce((s, c) => s + c[k], 0);
    res.send({
      fecha, cajeros: lista,
      totales: { ventas: suma("ventas"), efectivo: suma("efectivo"), pos: suma("pos"), total: suma("total"), boletos: suma("boletos"), productos: suma("productos"), reembolsos: suma("reembolsos"), montoReembolsos: suma("montoReembolsos") },
    });
  } catch (err) {
    console.error("[reportes] Error en corte de caja:", err.message);
    res.status(500).send({ message: "Error al calcular el corte de caja: " + err.message });
  }
};
