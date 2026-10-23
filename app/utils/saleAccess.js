const crypto = require("crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const igual = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

// Duenio (JWT), admin, o invitado con el token de esa venta (cabecera x-guest-token)
exports.puedeAcceder = (venta, req) =>
  req.userRole === "admin" ||
  (!!req.userId && venta.userId === req.userId) ||
  (!!venta.guestToken && igual(req.headers["x-guest-token"], venta.guestToken));

exports.nuevoToken = () => crypto.randomBytes(24).toString("hex");
exports.EMAIL_RE = EMAIL_RE;
