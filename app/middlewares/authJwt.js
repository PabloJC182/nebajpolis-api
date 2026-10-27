
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");

verifyToken = (req, res, next) => {
  
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
    
    
    req.userRole = decoded.role;
    next();
  });
};



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

// Permite el paso solo a los roles indicados (el admin siempre pasa). El rol se lee de la base de datos,
// no del token, para que un cambio de rol (o una baja) surta efecto de inmediato.
const conRol = (...roles) => (req, res, next) => {
  const db = require("../models");
  db.appUsers.findByPk(req.userId, { attributes: ["id", "role"] })
    .then(user => {
      if (user && (user.role === "admin" || roles.includes(user.role))) {
        req.userRole = user.role;
        return next();
      }
      res.status(403).send({ message: "No tienes permiso para esta accion." });
    })
    .catch(() => res.status(500).send({ message: "Error al verificar el rol del usuario." }));
};

// Si hay token valido llena req.userId/req.userRole (rol actual de la base de datos); si no, deja pasar (compra como invitado)
optionalAuth = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];
  if (token && token.startsWith("Bearer ")) token = token.slice(7);
  if (!token) return next();
  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) return next();
    req.userId = decoded.id; req.userRole = decoded.role;
    require("../models").appUsers.findByPk(decoded.id, { attributes: ["role"] })
      .then(u => { if (u) req.userRole = u.role; })
      .catch(() => {})
      .then(() => next());
  });
};

const authJwt = { verifyToken, isAdmin, conRol, optionalAuth };
module.exports = authJwt;
