// app/jobs/expireSales.job.js
// Libera los asientos de ventas que quedaron en estado "pending" (el usuario
// selecciono asientos pero nunca completo el pago) despues de SALE_HOLD_MINUTES.
//
// Borra los tickets asociados (esto es lo que realmente libera el asiento, gracias
// al indice unico showId+seatId en el modelo Ticket) y marca la venta como "expired".
module.exports = (db) => {
  const HOLD_MINUTES = parseInt(process.env.SALE_HOLD_MINUTES || "10", 10);

  return async function expirePendingSales() {
    const limite = new Date(Date.now() - HOLD_MINUTES * 60 * 1000);
    const t = await db.sequelize.transaction();

    try {
      const ventasExpiradas = await db.sales.findAll({
        where: {
          status: "pending",
          saleDate: { [db.Sequelize.Op.lt]: limite }
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      for (const sale of ventasExpiradas) {
        await db.tickets.destroy({ where: { saleId: sale.id }, transaction: t });
        sale.status = "expired";
        await sale.save({ transaction: t });
      }

      await t.commit();

      if (ventasExpiradas.length > 0) {
        console.log(`[expireSales] Se liberaron ${ventasExpiradas.length} venta(s) pendiente(s) vencidas.`);
      }
    } catch (err) {
      await t.rollback();
      console.log("[expireSales] Error al liberar ventas pendientes vencidas:", err.message);
    }
  };
};
