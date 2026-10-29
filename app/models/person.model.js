
module.exports = (sequelize, Sequelize) => {
  const Person = sequelize.define("person", {
    fullName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    photoUrl: {
      type: Sequelize.STRING(1000)
    },
    birthDate: {
      type: Sequelize.DATEONLY
    },
    
    biography: {
      type: Sequelize.TEXT
    }
  });
  return Person;
};
