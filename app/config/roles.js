// Roles del sistema. "admin" puede todo; el resto tiene permisos acotados:
//  customer: compra y ve sus boletos | taquilla: vende en caja y valida QR | analista: solo reportes (sin datos personales)
const ROLES = ["customer", "taquilla", "analista", "admin"];
const ETIQUETAS = { customer: "Cliente", taquilla: "Taquilla", analista: "Analista de datos", admin: "Administrador" };
module.exports = { ROLES, ETIQUETAS };
