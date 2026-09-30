
module.exports = (sequelize, Sequelize) => {
  const Show = sequelize.define("show", {
    showDatetime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    basePrice: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    
    format: {
      type: Sequelize.STRING,
      defaultValue: "subtitulada"
    },
    
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return Show;
};
