const crypto = require("crypto");
const db = require("../models");
const config = require("../config/auth.config.js");
const mail = require("../services/mail.service.js");
const AppUser = db.appUsers;
const { Op, fn, col, where } = db.Sequelize;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const normalizar = (email) => String(email || "").trim().toLowerCase();
const buscarPorEmail = (email) => AppUser.findOne({ where: where(fn("lower", col("email")), normalizar(email)) });
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const perfil = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });


exports.signup = async (req, res) => {
  const email = normalizar(req.body.email);
  const { password, fullName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "email y password son requeridos." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).send({ message: "El correo no tiene un formato valido." });
  }
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).send({ message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
  }

  try {
    if (await buscarPorEmail(email)) {
      return res.status(409).send({ message: "Ya existe una cuenta con ese correo." });
    }
    const user = await AppUser.create({
      fullName: String(fullName || "").trim() || email.split("@")[0],
      email,
      password: bcrypt.hashSync(password, 8),
      phone,
      role: "customer"
    });
    res.send({ message: "Usuario registrado exitosamente!", id: user.id });
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrio un error al registrar el usuario." });
  }
};


exports.signin = (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: "email y password son requeridos." });
  }
  buscarPorEmail(req.body.email)
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


exports.me = async (req, res) => {
  try {
    const user = await AppUser.findByPk(req.userId);
    if (!user) return res.status(404).send({ message: "Usuario no encontrado." });
    res.send(perfil(user));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


exports.updateMe = async (req, res) => {
  try {
    const user = await AppUser.findByPk(req.userId);
    if (!user) return res.status(404).send({ message: "Usuario no encontrado." });

    const fullName = String(req.body.fullName ?? user.fullName).trim();
    if (!fullName) return res.status(400).send({ message: "El nombre no puede estar vacio." });

    await user.update({ fullName, phone: req.body.phone ?? user.phone });
    res.send(perfil(user));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).send({ message: "currentPassword y newPassword son requeridos." });
  }
  if (String(newPassword).length < MIN_PASSWORD) {
    return res.status(400).send({ message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
  }
  try {
    const user = await AppUser.findByPk(req.userId);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).send({ message: "La contraseña actual es incorrecta." });
    }
    await user.update({ password: bcrypt.hashSync(newPassword, 8) });
    res.send({ message: "Contraseña actualizada." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


// Siempre responde igual exista o no el correo (no revela que cuentas existen)
exports.forgot = async (req, res) => {
  const respuesta = { message: "Si el correo existe, te enviamos un enlace para recuperar tu contraseña." };
  try {
    const user = req.body.email ? await buscarPorEmail(req.body.email) : null;
    if (!user) return res.send(respuesta);

    const token = crypto.randomBytes(32).toString("hex");
    await db.passwordResets.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const frontend = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(/\/+$/, "");
    const enlace = `${frontend}/restablecer?token=${token}`;
    if (mail.configurado()) {
      await mail.enviarRecuperacion(user, enlace);
    } else {
      // Sin SMTP (desarrollo): el enlace se imprime en la consola del servidor
      console.log(`[auth] SMTP no configurado. Enlace de recuperacion para ${user.email}: ${enlace}`);
    }
    res.send(respuesta);
  } catch (err) {
    console.error("[auth] Error en forgot:", err.message);
    res.send(respuesta);
  }
};


exports.reset = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).send({ message: "token y password son requeridos." });
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).send({ message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
  }
  try {
    const registro = await db.passwordResets.findOne({
      where: { tokenHash: hashToken(String(token)), usedAt: null, expiresAt: { [Op.gt]: new Date() } }
    });
    if (!registro) return res.status(400).send({ message: "El enlace es invalido o ya vencio." });

    await AppUser.update({ password: bcrypt.hashSync(password, 8) }, { where: { id: registro.userId } });
    registro.usedAt = new Date();
    await registro.save();
    res.send({ message: "Contraseña actualizada. Ya puedes iniciar sesion." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
