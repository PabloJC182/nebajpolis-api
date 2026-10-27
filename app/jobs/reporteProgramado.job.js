const reporte = require("../services/reporte.service.js");
const mail = require("../services/mail.service.js");

module.exports = (db) => {
  const ultimoIntento = new Map(); // id -> ms; tras un fallo se espera 1 hora para no insistir cada 10 min
  return async function enviarReportesProgramados() {
    if (!mail.configurado()) return;
    try {
      const pendientes = await db.reportSchedules.findAll({ where: { active: true } });
      for (const s of pendientes) {
        if (!reporte.toca(s)) continue;
        if (Date.now() - (ultimoIntento.get(s.id) ?? 0) < 60 * 60 * 1000) continue;
        ultimoIntento.set(s.id, Date.now());
        try {
          const rango = await reporte.enviarSchedule(s);
          await s.update({ lastSentAt: new Date(), lastError: null });
          console.log(`[reporte] Enviado ${rango.etiqueta} (${rango.desde} a ${rango.hasta}) a ${s.email}`);
        } catch (err) {
          await s.update({ lastError: String(err.message).slice(0, 500) }).catch(() => {});
          console.error(`[reporte] No se pudo enviar a ${s.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[reporte] Error en el job:", err.message);
    }
  };
};
