// app/middlewares/authJwt.js
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");

verifyToken = (req, res, next) => {
  // El token viaja en el header "x-access-token" o en "Authorization: Bearer <token>"
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  if (!token) {
    return res.status(403).send({ message: "No se proporciono ningun token." });
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "No autorizado: token invalido o expirado." });
    }
    req.userId = decoded.id;
    // Disponible para chequeos rapidos (ej. "es el dueño o es admin"); para decisiones
    // sensibles de autorizacion se sigue usando isAdmin, que consulta la BD directamente.
    req.userRole = decoded.role;
    next();
  });
};

// Verifica que el usuario autenticado tenga rol "admin".
// Debe usarse SIEMPRE despues de verifyToken, ya que depende de req.userId.
isAdmin = (req, res, next) => {
  const db = require("../models");
  db.appUsers.findByPk(req.userId)
    .then(user => {
      if (user && user.role === "admin") {
        return next();
      }
      res.status(403).send({ message: "Se requiere rol de administrador." });
    })
    .catch(err => {
      res.status(500).send({ message: "Error al verificar el rol del usuario." });
    });
};

const authJwt = { verifyToken, isAdmin };
module.exports = authJwt;
