// app/models/person.model.js
module.exports = (sequelize, Sequelize) => {
  const Person = sequelize.define("person", {
    fullName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    photoUrl: {
      type: Sequelize.STRING
    },
    birthDate: {
      type: Sequelize.DATEONLY
    },
    // Texto biografico corto para la pantalla de reparto. Opcional.
    biography: {
      type: Sequelize.TEXT
    }
  });
  return Person;
};
