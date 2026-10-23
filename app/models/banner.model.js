module.exports = (sequelize, Sequelize) => {
  const Banner = sequelize.define("banner", {
    title: { type: Sequelize.STRING, allowNull: false },
    subtitle: { type: Sequelize.STRING },
    imageUrl: { type: Sequelize.STRING(1000), allowNull: false },
    // Ruta interna ("/promociones") o URL https completa
    linkUrl: { type: Sequelize.STRING(1000) },
    buttonText: { type: Sequelize.STRING },
    // Menor numero = aparece primero
    sortOrder: { type: Sequelize.INTEGER, defaultValue: 0 },
    validFrom: { type: Sequelize.DATE },
    validTo: { type: Sequelize.DATE },
    status: { type: Sequelize.BOOLEAN, defaultValue: true }
  });
  return Banner;
};
