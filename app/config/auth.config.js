// app/config/auth.config.js
module.exports = {
  secret: process.env.JWT_SECRET,
  // Tiempo de vida del token: pasado este tiempo, el usuario debe volver a iniciar sesion.
  expiresIn: process.env.JWT_EXPIRES_IN || "1h"
};
