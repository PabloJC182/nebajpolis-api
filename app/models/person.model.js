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
    }
  });
  return Person;
};
