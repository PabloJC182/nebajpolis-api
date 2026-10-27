const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const db = require("../models");
const ticketCode = require("../utils/ticketCode");

let transporter = null;

const usaApi = () => !!process.env.BREVO_API_KEY;
const configurado = () => !!process.env.MAIL_FROM && (usaApi() || !!(process.env.SMTP_USER && process.env.SMTP_PASS));

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dinero = (n) => `Q${Number(n).toFixed(2)}`;

const plantilla = (titulo, cuerpo) => `
<div style="background:#08090C;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
  <div style="max-width:560px;margin:0 auto;background:#121318;border:1px solid #2a2b33;border-radius:16px;overflow:hidden">
    <div style="padding:20px 24px;background:linear-gradient(90deg,#7e22ce,#c026d3)">
      <div style="font-size:20px;font-weight:900;letter-spacing:3px">NEBAJPOLIS</div>
      <div style="font-size:13px;opacity:.9">${esc(titulo)}</div>
    </div>
    <div style="padding:24px">${cuerpo}</div>
    <div style="padding:16px 24px;font-size:11px;color:#8b8d98;border-top:1px solid #2a2b33">Este es un correo automático, por favor no respondas a este mensaje.</div>
  </div>
</div>`;

// Render (plan gratis) bloquea SMTP saliente: con BREVO_API_KEY se envia por HTTPS (puerto 443)
async function enviarPorApi({ to, subject, html, attachments = [], replyTo }) {
  const m = String(process.env.MAIL_FROM).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const sender = m ? { name: m[1].trim() || "Nebajpolis", email: m[2].trim() } : { name: "Nebajpolis", email: process.env.MAIL_FROM.trim() };
  // la API de Brevo no soporta imagenes cid: el QR va como adjunto
  let htmlApi = html;
  for (const a of attachments) {
    const i = htmlApi.indexOf(`<img src="cid:${a.cid}"`);
    if (i < 0) continue;
    const j = htmlApi.indexOf(">", i) + 1;
    htmlApi = htmlApi.slice(0, i) + `<div style="font-size:12px;color:#d8b4fe;text-align:center">QR adjunto:<br><b>${esc(a.filename)}</b></div>` + htmlApi.slice(j);
  }
  const body = { sender, to: [{ email: to }], subject, htmlContent: htmlApi, ...(replyTo ? { replyTo: { email: replyTo } } : {}) };
  if (attachments.length) body.attachment = attachments.map((a) => ({ name: a.filename, content: a.content.toString("base64") }));
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Brevo API ${res.status}: ${await res.text()}`);
}

async function enviar({ to, subject, html, attachments, replyTo }) {
  if (!configurado()) {
    console.log(`[mail] Correo no configurado (BREVO_API_KEY o SMTP_USER/SMTP_PASS, y MAIL_FROM). No se envio "${subject}" a ${to}.`);
    return { enviado: false, motivo: "Correo no configurado" };
  }
  if (usaApi()) await enviarPorApi({ to, subject, html, attachments, replyTo });
  else await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, html, attachments, replyTo });
  return { enviado: true };
}

// Correo con las entradas (un QR por boleto) de una venta pagada
async function enviarEntradas(saleId, { forzar = false } = {}) {
  const venta = await db.sales.findByPk(saleId, {
    include: [
      { model: db.appUsers, attributes: ["id", "fullName", "email"] },
      { model: db.tickets, include: [db.seats, { model: db.shows, include: [db.movies, { model: db.rooms, include: [db.cinemas] }] }] },
      { model: db.saleFoodItems, include: [db.foodItems] }
    ]
  });
  if (!venta) throw new Error(`Venta ${saleId} no encontrada`);
  if (venta.status !== "paid") throw new Error("La venta aun no esta pagada");
  const destino = venta.appUser?.email || venta.guestEmail;
  const nombre = venta.appUser?.fullName || venta.guestName || "";
  if (!destino) throw new Error("La venta no tiene correo de destino");
  if (venta.emailSentAt && !forzar) return { enviado: false, motivo: "Ya se envió antes" };

  if (venta.kind === "food") return enviarPedidoComida(venta, destino, nombre);

  const adjuntos = [];
  let tarjetas = "";
  for (const t of venta.tickets) {
    const codigo = ticketCode.generar(venta.id, t.id, t.seatId);
    const cid = `qr-${t.id}@nebajpolis`;
    adjuntos.push({ filename: `entrada-${t.id}.png`, content: await QRCode.toBuffer(codigo, { width: 280, margin: 1 }), cid });
    const f = new Date(t.show.showDatetime);
    const fecha = f.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Guatemala" });
    const hora = f.toLocaleTimeString("es-GT", { hour: "numeric", minute: "2-digit", timeZone: "America/Guatemala" });
    tarjetas += `
    <table role="presentation" width="100%" style="background:#0D0E12;border:1px solid #2a2b33;border-radius:12px;margin-bottom:14px"><tr>
      <td style="padding:16px;vertical-align:top">
        <div style="font-size:16px;font-weight:800">${esc(t.show.movie?.title)}</div>
        <div style="font-size:13px;color:#b9bbc6;margin-top:4px">${esc(fecha)} · ${esc(hora)}</div>
        <div style="font-size:13px;color:#b9bbc6">${esc(t.show.room?.cinema?.name)} · ${esc(t.show.room?.name)}${t.show.format ? " · " + esc(t.show.format) : ""}</div>
        <div style="font-size:14px;color:#d8b4fe;font-weight:700;margin-top:8px">Fila ${esc(t.seat.rowLabel)} — Asiento ${esc(t.seat.seatNumber)}</div>
      </td>
      <td style="padding:16px;width:120px" align="center"><img src="cid:${cid}" width="110" height="110" alt="QR" style="background:#fff;padding:4px;border-radius:8px"></td>
    </tr></table>`;
  }
  let comida = "";
  if ((venta.saleFoodItems || []).length) {
    const cidF = `pedido-${venta.id}@nebajpolis`;
    adjuntos.push({ filename: `comida-${venta.id}.png`, content: await QRCode.toBuffer(ticketCode.generarPedido(venta.id), { width: 280, margin: 1 }), cid: cidF });
    const vence = ticketCode.venceComida(venta).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Guatemala" });
    comida = `
    <table role="presentation" width="100%" style="background:#0D0E12;border:1px solid #6b21a8;border-radius:12px;margin-bottom:14px"><tr>
      <td style="padding:16px;vertical-align:top">
        <div style="font-size:16px;font-weight:800">🍿 Tu comida (QR aparte)</div>
        <div style="font-size:13px;color:#b9bbc6;margin-top:4px">${venta.saleFoodItems.map((l) => `${l.quantity}× ${esc(l.foodItem?.name)}`).join(", ")}</div>
        <div style="font-size:13px;color:#d8b4fe;margin-top:8px">Válido hasta el ${esc(vence)} (6 meses). Si no puedes ir a la función, no pierdes tu comida: pásala a recoger a la dulcería.</div>
      </td>
      <td style="padding:16px;width:120px" align="center"><img src="cid:${cidF}" width="110" height="110" alt="QR comida" style="background:#fff;padding:4px;border-radius:8px"></td>
    </tr></table>`;
  }

  const html = plantilla("¡Tu compra fue confirmada!", `
    <p style="font-size:15px;margin-top:0">Hola ${esc(nombre)}, estas son tus entradas. Presenta el código QR en la entrada de la sala.</p>
    ${tarjetas}${comida}
    <p style="font-size:16px;font-weight:800;margin-bottom:0">Total pagado: <span style="color:#d8b4fe">${dinero(venta.totalAmount)}</span></p>
    <p style="font-size:12px;color:#8b8d98">Compra #${venta.id}</p>`);

  const r = await enviar({ to: destino, subject: `Tus entradas de Nebajpolis · Compra #${venta.id}`, html, attachments: adjuntos });
  if (r.enviado) { venta.emailSentAt = new Date(); await venta.save(); }
  return r;
}

// Pedido de dulceria (sin boletos): un solo QR para recogerlo en el cine
async function enviarPedidoComida(venta, destino, nombre) {
  const cine = venta.pickupCinemaId ? await db.cinemas.findByPk(venta.pickupCinemaId) : null;
  const cid = `pedido-${venta.id}@nebajpolis`;
  const adjuntos = [{ filename: `pedido-${venta.id}.png`, content: await QRCode.toBuffer(ticketCode.generarPedido(venta.id), { width: 280, margin: 1 }), cid }];
  const lineas = (venta.saleFoodItems || []).map((l) =>
    `<tr><td style="padding:6px 0;font-size:14px">${l.quantity}× ${esc(l.foodItem?.name)}</td><td align="right" style="padding:6px 0;font-size:14px;color:#d8b4fe">${dinero(l.quantity * l.unitPrice)}</td></tr>`).join("");
  const html = plantilla("¡Tu pedido de dulcería está listo para recoger!", `
    <p style="font-size:15px;margin-top:0">Hola ${esc(nombre)}, presenta este código QR en la dulcería${cine ? ` de <b>${esc(cine.name)}</b>` : ""} para recoger tu pedido.</p>
    <table role="presentation" width="100%" style="background:#0D0E12;border:1px solid #2a2b33;border-radius:12px;margin-bottom:14px"><tr>
      <td style="padding:16px;vertical-align:top"><table role="presentation" width="100%">${lineas}</table>
        <p style="font-size:12px;color:#8b8d98;margin:10px 0 0">${cine?.address ? esc(cine.address) : ""}</p></td>
      <td style="padding:16px;width:120px" align="center"><img src="cid:${cid}" width="110" height="110" alt="QR" style="background:#fff;padding:4px;border-radius:8px"></td>
    </tr></table>
    <p style="font-size:16px;font-weight:800;margin-bottom:0">Total pagado: <span style="color:#d8b4fe">${dinero(venta.totalAmount)}</span></p>
    <p style="font-size:12px;color:#8b8d98">Pedido #${venta.id}. Tu código vale 6 meses desde la compra y solo se puede usar una vez.</p>`);
  const r = await enviar({ to: destino, subject: `Tu pedido de dulcería de Nebajpolis · Pedido #${venta.id}`, html, attachments: adjuntos });
  if (r.enviado) { venta.emailSentAt = new Date(); await venta.save(); }
  return r;
}

async function enviarRecuperacion(usuario, enlace) {
  const html = plantilla("Recupera tu contraseña", `
    <p style="font-size:15px;margin-top:0">Hola ${esc(usuario.fullName || "")}, recibimos una solicitud para cambiar tu contraseña.</p>
    <p><a href="${esc(enlace)}" style="display:inline-block;background:#7e22ce;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">Crear nueva contraseña</a></p>
    <p style="font-size:12px;color:#8b8d98">El enlace vence en 1 hora. Si no fuiste tú, ignora este correo.</p>`);
  return enviar({ to: usuario.email, subject: "Recupera tu contraseña · Nebajpolis", html });
}

async function enviarReembolso(saleId) {
  const venta = await db.sales.findByPk(saleId, { include: [{ model: db.appUsers, attributes: ["fullName", "email"] }] });
  const destino = venta?.appUser?.email || venta?.guestEmail;
  if (!destino) return { enviado: false, motivo: "Sin correo" };
  const html = plantilla("Reembolso de tu compra", `
    <p style="font-size:15px;margin-top:0">Hola ${esc(venta.appUser?.fullName || venta.guestName || "")}, tu compra #${venta.id} fue reembolsada.</p>
    <p style="font-size:15px">Monto: <b style="color:#d8b4fe">${dinero(venta.refundAmount ?? venta.totalAmount)}</b></p>
    <p style="font-size:12px;color:#8b8d98">Si pagaste con tarjeta, el banco puede tardar algunos días hábiles en reflejarlo. Tus entradas anteriores ya no son válidas.</p>`);
  return enviar({ to: destino, subject: `Reembolso de tu compra #${venta.id} · Nebajpolis`, html });
}

// Mensaje del formulario de contacto -> bandeja del cine (CONTACT_EMAIL, o el propio remitente)
async function enviarContacto({ name, email, subject, message }) {
  const m = String(process.env.MAIL_FROM || "").match(/<([^>]+)>/);
  const destino = process.env.CONTACT_EMAIL || (m ? m[1] : process.env.MAIL_FROM);
  const html = plantilla("Nuevo mensaje de contacto", `
    <p style="font-size:14px;margin-top:0"><b>${esc(name)}</b> &lt;${esc(email)}&gt;</p>
    <p style="font-size:14px;color:#d8b4fe"><b>${esc(subject || "Sin asunto")}</b></p>
    <p style="font-size:14px;white-space:pre-wrap;color:#e5e7eb">${esc(message)}</p>
    <p style="font-size:12px;color:#8b8d98">Puedes responder directamente a este correo.</p>`);
  return enviar({ to: destino, replyTo: email, subject: `Contacto web: ${subject || "mensaje"} · ${name}`.slice(0, 120), html });
}


const difMonto = (n) => `${Number(n) >= 0 ? "+" : "−"}${dinero(Math.abs(Number(n)))}`;

// Reporte periodico para el dueno / proveedor (datos agregados, sin informacion personal de clientes)
async function enviarReporte(to, { desde, hasta, etiqueta }, d) {
  const k = d.resumen.kpi;
  const pct = (n) => `${(Number(n) * 100).toFixed(0)}%`;
  const fila = (a, b) => `<tr><td style="padding:6px 0;color:#9ca3af;font-size:13px">${esc(a)}</td><td style="padding:6px 0;text-align:right;font-weight:bold;font-size:14px">${esc(b)}</td></tr>`;
  const lista = (titulo, filas) => filas.length ? `<h3 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d8b4fe;margin:22px 0 6px">${esc(titulo)}</h3><table style="width:100%;border-collapse:collapse">${filas.join("")}</table>` : "";
  const top = (arr, f) => arr.slice(0, 5).map(f);

  const alertas = [];
  for (const i of d.stockBajo) alertas.push(fila(i.name, i.agotado ? "AGOTADO" : `quedan ${i.stock} (mín. ${i.stockMin})`));
  const cierres = d.cierres.map((c) => fila(`${c.cajero} · ${new Date(c.closedAt).toLocaleDateString("es-GT", { timeZone: "America/Guatemala" })}`, `efectivo ${difMonto(c.diffCash)} · POS ${difMonto(c.diffPos)}`));

  const html = plantilla(`Reporte ${etiqueta}: ${desde} a ${hasta}`, `
    <table style="width:100%;border-collapse:collapse">
      ${fila("Ingresos netos", dinero(k.ingresos))}
      ${fila("Ventas pagadas", k.ventas)}
      ${fila("Boletos vendidos", k.boletos)}
      ${fila("Ticket promedio", dinero(k.ticketPromedio))}
      ${fila("Ocupación promedio", pct(k.ocupacionPromedio))}
      ${fila("Compras de boletos con dulcería", pct(k.porcentajeConComida))}
      ${fila("Reembolsos", `${k.reembolsos} (${dinero(k.montoReembolsado)})`)}
      ${fila("No-show (boletos sin usar)", k.noShow)}
      ${fila("Comida cobrada sin canjear", `${d.resumen.comidaPendiente.pedidos} pedidos · ${dinero(d.resumen.comidaPendiente.monto)}`)}
    </table>
    ${lista("Películas con más ingresos", top(d.resumen.porPelicula, (p) => fila(p.title, `${p.boletos} boletos · ${dinero(p.ingresos)}`)))}
    ${lista("Dulcería: lo que más se vendió", top(d.resumen.comida, (c) => fila(c.name, `${c.unidades} u. · ${dinero(c.ingresos)}`)))}
    ${lista("Cupones", top(d.resumen.cupones, (c) => fila(c.code, `${c.usos} usos · −${dinero(c.descuento)}`)))}
    ${lista("Combos", top(d.resumen.combos, (c) => fila(c.name, `${c.ventas} ventas · ${dinero(c.ingresos)}`)))}
    ${lista("⚠ Inventario por reponer", alertas)}
    ${lista("⚠ Cierres de caja con diferencia", cierres)}
    <p style="font-size:12px;color:#8b8d98;margin-top:22px">Ingresos netos = ventas pagadas (los reembolsos no cuentan). Horario de Guatemala.</p>`);
  return enviar({ to, subject: `Nebajpolis · Reporte ${etiqueta} (${desde} a ${hasta})`, html });
}

module.exports = { enviarEntradas, enviarRecuperacion, enviarReembolso, enviarContacto, enviarReporte, configurado };
