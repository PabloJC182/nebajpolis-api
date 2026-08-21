// app/controllers/auth.controller.js
const db = require("../models");
const config = require("../config/auth.config.js");
const AppUser = db.appUsers;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Registro de un nuevo usuario (cliente por defecto)
exports.signup = (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: "email y password son requeridos." });
  }

  // Ciframos la contraseña ANTES de guardarla; nunca se guarda en texto plano
  const hashedPassword = bcrypt.hashSync(req.body.password, 8);

  AppUser.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: hashedPassword,
    phone: req.body.phone,
    // El rol "admin" NUNCA se asigna desde el body publico; se cambia manualmente en la BD
    role: "customer"
  })
    .then(user => {
      res.send({ message: "Usuario registrado exitosamente!", id: user.id });
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Ocurrio un error al registrar el usuario." });
    });
};

// Inicio de sesion: valida que el usuario exista y que la contraseña coincida
exports.signin = (req, res) => {
  AppUser.findOne({ where: { email: req.body.email } })
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "Usuario no encontrado." });
      }

      const passwordEsValida = bcrypt.compareSync(req.body.password, user.password);
      if (!passwordEsValida) {
        return res.status(401).send({ message: "Contraseña incorrecta." });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
        expiresIn: config.expiresIn
      });

      res.status(200).send({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accessToken: token,
        expiresIn: config.expiresIn
      });
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Ocurrio un error al iniciar sesion." });
    });
};
