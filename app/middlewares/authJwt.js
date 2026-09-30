
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

const authJwt = { verifyToken, isAdmin };
module.exports = authJwt;
