// Bitacora de auditoria. Registrar NUNCA debe romper la operacion principal: todo error se traga y se registra en consola.
const db = require("../models");

const SENSIBLES = new Set(["password", "token", "keyHash", "guestToken"]);

const actorDe = async (req) => {
  if (req.apiKeyId) return { userId: null, actor: `llave: ${req.apiKeyName}`, role: "proveedor" };
  if (!req.userId) return { userId: null, actor: "anonimo", role: null };
  try {
    const u = await db.appUsers.findByPk(req.userId, { attributes: ["id", "email", "role"] });
    return { userId: req.userId, actor: u?.email ?? `usuario ${req.userId}`, role: u?.role ?? req.userRole ?? null };
  } catch {
    return { userId: req.userId, actor: `usuario ${req.userId}`, role: req.userRole ?? null };
  }
};

async function registrar(req, { action, entity, entityId, summary, meta }) {
  try {
    const a = await actorDe(req);
    await db.auditLogs.create({
      ...a, action, entity, entityId: entityId === undefined || entityId === null ? null : String(entityId),
      summary: summary ? String(summary).slice(0, 1000) : null,
      meta: meta ?? null,
      ip: String(req.ip || "").slice(0, 60) || null,
    });
  } catch (err) {
    console.error("[audit] No se pudo registrar:", err.message);
  }
}

// Valores comparables: "35.00" y 35 son iguales; fechas por instante; listas por contenido ordenado
const norm = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return JSON.stringify(v.map(String).sort());
  if (typeof v === "boolean") return v;
  if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))) return String(Number(v));
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !isNaN(Date.parse(v))) return new Date(v).toISOString();
  return String(v);
};
const mostrar = (v) => (v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(",") : v === undefined ? null : v);

const cambiosEntre = (antes, body) => {
  const cambios = {};
  for (const k of Object.keys(body || {})) {
    if (SENSIBLES.has(k) || !(k in antes)) continue;
    const a = antes[k] instanceof Date ? antes[k] : antes[k];
    if (norm(a) !== norm(body[k])) cambios[k] = { antes: mostrar(a), despues: mostrar(body[k]) };
  }
  return cambios;
};

const ETIQUETA = { crear: "Creó", actualizar: "Actualizó", eliminar: "Eliminó" };
const nombreDe = (o) => o?.name ?? o?.title ?? o?.fullName ?? o?.code ?? null;

/**
 * Middleware para rutas CRUD (POST create / PUT update / DELETE delete). Registra DESPUES de que la
 * operacion respondio con exito. En actualizaciones guarda el antes/despues de cada campo que cambio
 * (asi se sabe quien movio un precio).
 *   auditar("food", "foodItems", "producto")
 */
const auditar = (entity, modelKey, etiqueta = entity) => async (req, res, next) => {
  const metodo = req.method;
  const accion = metodo === "POST" ? "crear" : metodo === "PUT" ? "actualizar" : metodo === "DELETE" ? "eliminar" : null;
  if (!accion) return next();
  let antes = null;
  if (accion !== "crear" && req.params.id) {
    try { const r = await db[modelKey].findByPk(req.params.id); antes = r ? r.toJSON() : null; } catch { /* sin antes */ }
  }
  const enviar = res.send.bind(res);
  res.send = (body) => { res.locals.cuerpoAuditado = body; return enviar(body); };
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    if (accion !== "crear" && !antes) return; // el controlador respondio 200 aunque no encontro el registro
    const cuerpo = res.locals.cuerpoAuditado;
    const id = accion === "crear" ? (cuerpo && typeof cuerpo === "object" ? cuerpo.id : null) : req.params.id;
    let meta = null;
    let detalle = "";
    if (accion === "actualizar") {
      const cambios = cambiosEntre(antes, req.body);
      if (Object.keys(cambios).length === 0) return; // no cambio nada
      meta = { cambios };
      detalle = ": " + Object.entries(cambios).map(([k, c]) => `${k} ${c.antes ?? "—"} → ${c.despues ?? "—"}`).join("; ");
    }
    const nombre = nombreDe(antes) ?? nombreDe(cuerpo) ?? nombreDe(req.body);
    registrar(req, {
      action: accion, entity, entityId: id,
      summary: `${ETIQUETA[accion]} ${etiqueta}${nombre ? ` "${nombre}"` : id ? ` #${id}` : ""}${detalle}`.slice(0, 900),
      meta,
    });
  });
  next();
};

module.exports = { registrar, auditar };
