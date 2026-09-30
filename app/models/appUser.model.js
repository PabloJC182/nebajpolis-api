
module.exports = (sequelize, Sequelize) => {
  const AppUser = sequelize.define("appUser", {
    fullName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING
    },
    
    role: {
      type: Sequelize.STRING,
      defaultValue: "customer"
    }
  });
  return AppUser;
};
