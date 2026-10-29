// Reglas de aplicacion de una promocion (se validan siempre en el servidor)
const TZ = "America/Guatemala";
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIA_CORTO = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// "2,5" | [2,5] | null -> [2,5] (0 = domingo ... 6 = sabado). Vacio = todos los dias.
const normalizarDias = (v) => {
  if (v === null || v === undefined || v === "") return [];
  const arr = Array.isArray(v) ? v : String(v).split(",");
  return [...new Set(arr.map(x => parseInt(x, 10)).filter(n => n >= 0 && n <= 6))].sort();
};
const diasATexto = (v) => normalizarDias(v).join(",") || null;

// Días en que aplica una promo: los configurados; si no hay ninguno, se deducen del nombre ("Martes 2x1" -> martes).
// Así una promo de martes creada sin días no se cobra en funciones de otros días.
const sinTildes = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const diasEfectivos = (promo) => {
  const explicitos = normalizarDias(promo && promo.validDays);
  if (explicitos.length) return explicitos;
  const texto = sinTildes(promo && promo.name);
  return DIAS.map((d, i) => (new RegExp("\\b" + sinTildes(d) + "s?\\b").test(texto) ? i : -1)).filter((i) => i >= 0);
};

const diaSemanaGT = (fecha) =>
  DIA_CORTO[new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(fecha))];

const textoDias = (dias) => {
  const d = normalizarDias(dias).map(n => DIAS[n]);
  return d.length <= 1 ? d[0] : d.slice(0, -1).join(", ") + " y " + d[d.length - 1];
};

// La vigencia (desde/hasta) se evalua al comprar; el dia de la semana, contra la fecha de la funcion.
function validar(promo, fechaFuncion, ahora = new Date()) {
  if (!promo || !promo.status) return { ok: false, motivo: "La promocion no esta activa." };
  if (promo.validFrom && new Date(promo.validFrom) > ahora) return { ok: false, motivo: `La promocion "${promo.name}" aun no esta vigente.` };
  if (promo.validTo && new Date(promo.validTo) < ahora) return { ok: false, motivo: `La promocion "${promo.name}" ya vencio.` };
  const dias = diasEfectivos(promo);
  if (dias.length && !dias.includes(diaSemanaGT(fechaFuncion))) {
    return { ok: false, motivo: `La promocion "${promo.name}" solo aplica en funciones de ${textoDias(dias)}.` };
  }
  return { ok: true };
}

module.exports = { validar, diasEfectivos, normalizarDias, diasATexto, textoDias, diaSemanaGT };
