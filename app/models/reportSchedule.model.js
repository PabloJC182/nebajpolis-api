// Reporte programado por correo (resumen diario o semanal para el dueno / proveedor)
module.exports = (sequelize, Sequelize) => sequelize.define("reportSchedule", {
  email: { type: Sequelize.STRING, allowNull: false },
  frequency: { type: Sequelize.STRING, defaultValue: "weekly" }, // weekly (lunes, semana anterior) | daily (dia anterior)
  active: { type: Sequelize.BOOLEAN, defaultValue: true },
  lastSentAt: { type: Sequelize.DATE },
  lastError: { type: Sequelize.TEXT },
  createdBy: { type: Sequelize.INTEGER }
});
