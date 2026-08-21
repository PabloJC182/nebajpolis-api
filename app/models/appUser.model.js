// app/models/appUser.model.js
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
    // Nunca se guarda en texto plano, solo su hash (bcrypt), igual que en el tutorial base
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING
    },
    // "customer" o "admin" — controla el acceso a rutas de gestion de cartelera
    role: {
      type: Sequelize.STRING,
      defaultValue: "customer"
    }
  });
  return AppUser;
};
