// Bitacora: quien hizo que y cuando (acciones sensibles del panel)
module.exports = (sequelize, Sequelize) => sequelize.define("auditLog", {
  userId: { type: Sequelize.INTEGER },
  actor: { type: Sequelize.STRING },          // correo del usuario, o "llave: nombre" si fue una llave de datos
  role: { type: Sequelize.STRING },
  action: { type: Sequelize.STRING, allowNull: false },   // crear | actualizar | eliminar | reembolsar | cambiar_rol | ...
  entity: { type: Sequelize.STRING, allowNull: false },   // food | shows | sales | users | ...
  entityId: { type: Sequelize.STRING },
  summary: { type: Sequelize.TEXT },
  meta: { type: Sequelize.JSONB },
  ip: { type: Sequelize.STRING }
}, { updatedAt: false });
