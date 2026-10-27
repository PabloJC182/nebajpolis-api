// Llaves de solo lectura para el proveedor de datos. Solo se guarda el hash: la llave se muestra una unica vez al crearla.
module.exports = (sequelize, Sequelize) => sequelize.define("apiKey", {
  name: { type: Sequelize.STRING, allowNull: false },
  keyPrefix: { type: Sequelize.STRING, allowNull: false },
  keyHash: { type: Sequelize.STRING, allowNull: false, unique: true },
  active: { type: Sequelize.BOOLEAN, defaultValue: true },
  expiresAt: { type: Sequelize.DATE },
  revokedAt: { type: Sequelize.DATE },
  lastUsedAt: { type: Sequelize.DATE },
  requests: { type: Sequelize.INTEGER, defaultValue: 0 },
  createdBy: { type: Sequelize.INTEGER }
});
