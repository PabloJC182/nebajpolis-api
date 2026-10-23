module.exports = (sequelize, Sequelize) => {
  const PasswordReset = sequelize.define("passwordReset", {
    tokenHash: { type: Sequelize.STRING, allowNull: false },
    expiresAt: { type: Sequelize.DATE, allowNull: false },
    usedAt: { type: Sequelize.DATE }
  });
  return PasswordReset;
};
