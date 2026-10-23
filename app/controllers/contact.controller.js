const mail = require("../services/mail.service.js");
const { EMAIL_RE } = require("../utils/saleAccess.js");

// POST /api/contact  { name, email, subject?, message }
exports.enviar = async (req, res) => {
  const b = req.body || {};
  // Campo trampa para bots: un humano no lo ve ni lo llena
  if (b.website) return res.send({ message: "Mensaje enviado. ¡Gracias por escribirnos!" });

  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().toLowerCase();
  const subject = String(b.subject || "").trim().slice(0, 120);
  const message = String(b.message || "").trim();

  if (name.length < 2) return res.status(400).send({ message: "Escribe tu nombre." });
  if (!EMAIL_RE.test(email)) return res.status(400).send({ message: "El correo no tiene un formato valido." });
  if (message.length < 10) return res.status(400).send({ message: "El mensaje es muy corto (minimo 10 caracteres)." });
  if (message.length > 2000) return res.status(400).send({ message: "El mensaje es muy largo (maximo 2000 caracteres)." });
  if (!mail.configurado()) return res.status(503).send({ message: "El formulario no esta disponible por ahora. Intenta mas tarde." });

  try {
    await mail.enviarContacto({ name, email, subject, message });
    res.send({ message: "Mensaje enviado. ¡Gracias por escribirnos!" });
  } catch (err) {
    console.error("[contact] No se pudo enviar el mensaje:", err.message);
    res.status(500).send({ message: "No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos." });
  }
};
