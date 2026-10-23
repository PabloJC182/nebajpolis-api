const db = require("../models");
const q = (sql, replacements) => db.sequelize.query(sql, { replacements, type: db.Sequelize.QueryTypes.SELECT });

// GET /api/stats/resumen?dias=14  (admin)
exports.resumen = async (req, res) => {
  const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 14, 1), 90);
  try {
    const [totales] = await q(`
      SELECT
        COUNT(*) FILTER (WHERE s.status = 'paid')::int AS "ventasPagadas",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s.status = 'paid'), 0)::float AS "ingresos",
        COUNT(*) FILTER (WHERE s.status = 'pending')::int AS "pendientes",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s.status = 'paid' AND s.channel = 'box_office'), 0)::float AS "ingresosTaquilla",
        COUNT(*) FILTER (WHERE s.status = 'refunded')::int AS "reembolsos",
        COALESCE(SUM(s."refundAmount") FILTER (WHERE s.status = 'refunded'), 0)::float AS "montoReembolsado"
      FROM "sales" s`);

    const [boletos] = await q(`
      SELECT COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE t."usedAt" IS NOT NULL)::int AS "usados"
      FROM "tickets" t JOIN "sales" s ON s.id = t."saleId" WHERE s.status = 'paid'`);

    const [clientes] = await q(`SELECT COUNT(*)::int AS "total" FROM "appUsers" WHERE role = 'customer'`);

    const ventasPorDia = await q(`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS "dia",
             COALESCE(v."ingresos", 0)::float AS "ingresos",
             COALESCE(v."ventas", 0)::int AS "ventas"
      FROM generate_series((CURRENT_DATE - (:dias - 1) * INTERVAL '1 day'), CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN (
        SELECT (s."saleDate" AT TIME ZONE 'America/Guatemala')::date AS dia,
               SUM(s."totalAmount") AS "ingresos", COUNT(*) AS "ventas"
        FROM "sales" s WHERE s.status = 'paid' GROUP BY 1
      ) v ON v.dia = d::date
      ORDER BY d`, { dias });

    const topPeliculas = await q(`
      SELECT m.id, m.title, COUNT(t.id)::int AS "boletos", COALESCE(SUM(t.price), 0)::float AS "ingresos"
      FROM "tickets" t
      JOIN "sales" s ON s.id = t."saleId" AND s.status = 'paid'
      JOIN "shows" sh ON sh.id = t."showId"
      JOIN "movies" m ON m.id = sh."movieId"
      GROUP BY m.id, m.title ORDER BY "boletos" DESC LIMIT 5`);

    const topComida = await q(`
      SELECT f.name, SUM(sf.quantity)::int AS "unidades", SUM(sf.quantity * sf."unitPrice")::float AS "ingresos"
      FROM "saleFoodItems" sf
      JOIN "sales" s ON s.id = sf."saleId" AND s.status = 'paid'
      JOIN "foodItems" f ON f.id = sf."foodItemId"
      GROUP BY f.name ORDER BY "unidades" DESC LIMIT 5`);

    const ocupacion = await q(`
      SELECT sh.id, m.title, sh."showDatetime", r.name AS "sala", r.capacity::int AS "capacidad",
             COUNT(t.id)::int AS "vendidos"
      FROM "shows" sh
      JOIN "movies" m ON m.id = sh."movieId"
      JOIN "rooms" r ON r.id = sh."roomId"
      LEFT JOIN "tickets" t ON t."showId" = sh.id
      WHERE sh."showDatetime" >= NOW()
      GROUP BY sh.id, m.title, r.name, r.capacity
      ORDER BY sh."showDatetime" ASC LIMIT 8`);

    const porEstado = await q(`SELECT status, COUNT(*)::int AS "total" FROM "sales" GROUP BY status ORDER BY "total" DESC`);

    res.send({ totales: { ...totales, clientes: clientes.total }, boletos, ventasPorDia, topPeliculas, topComida, ocupacion, porEstado });
  } catch (err) {
    console.error("[stats] Error:", err.message);
    res.status(500).send({ message: "Error al calcular las estadisticas: " + err.message });
  }
};
