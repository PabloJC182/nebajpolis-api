// Uso:  1) pega tu token abajo   2) en la terminal de VS Code:  node funciones.js
// Crea FUNCIONES (horarios) para las películas que ya tienes, desde MAÑANA y por los próximos días, repartidas
// en todas tus salas, sin que se empalmen dos películas en la misma sala (usa la duración real de cada película + limpieza).
// También pone el TRÁILER de YouTube a las películas que no lo tengan (ver TRAILERS y TMDB_KEY).
// No repite: si una sala ya tiene funciones ese día, ese día se deja como está. Se puede correr varias veces.
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";

const DIAS = 7;                   // cuántos días generar, empezando mañana
const PRIMERA_FUNCION = "13:00";  // hora de la primera función del día en cada sala (hora de Guatemala)
const ULTIMA_FUNCION = "21:30";   // hora máxima a la que puede EMPEZAR una función
const LIMPIEZA_MIN = 20;          // minutos entre una función y la siguiente en la misma sala
const PRECIO_SEMANA = 40;         // Q por boleto, lunes a jueves
const PRECIO_FIN_DE_SEMANA = 50;  // Q por boleto, viernes a domingo
const DESCUENTO_MATINE = 10;      // Q menos en funciones que empiezan antes de las 15:00
const CINE = "";                  // "" = todas las salas. O el nombre de un cine para usar solo sus salas (ej. "Cine Antigua")
const SOLO_PELICULAS = [];        // [] = todas las películas activas. O títulos: ["Interstellar", "Inception"]
const REPROGRAMAR_DIAS_CON_FUNCIONES = false; // false = si una sala ya tiene funciones ese día, ese día se deja como está (así no se duplica al correrlo otra vez)
const SIMULAR = false;            // true = solo muestra qué crearía, sin guardar nada (recomendado la primera vez)

// ====== TRÁILERS ======
const ACTUALIZAR_TRAILERS = true;     // false = no tocar los tráilers
const SOBRESCRIBIR_TRAILERS = false;  // true = reemplaza también los tráilers que ya tengan
// Con una clave gratuita de TMDB (themoviedb.org → Configuración → API → "Clave de API v3") el script busca solo el
// tráiler oficial en YouTube de cada película. Sin clave solo se usan los de la lista TRAILERS de abajo.
const TMDB_KEY = "";
// Tráilers a mano (por título; con "|" otros nombres de la misma película). Tiene prioridad sobre TMDB.
// Whalefall y Sense and Sensibility los comprobé en la página oficial donde están incrustados.
// Interstellar, Inception, The Dark Knight y The Matrix los puse de memoria: ABRE cada enlace para confirmar que sea el tráiler correcto.
// Street Fighter, Crawlers, Spirited Away y Puro Mula no pude confirmarlos: pega su enlace de YouTube aquí o usa TMDB_KEY.
const TRAILERS = {
  "Whalefall": "https://www.youtube.com/watch?v=rN9F6-tbySY",
  "Sense and Sensibility|Sentido y sensibilidad|Razón y sentimiento": "https://www.youtube.com/watch?v=mcrwcvad84U",
  "Interstellar": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "Inception|El origen|Origen": "https://www.youtube.com/watch?v=YoHD9XEInc0",
  "The Dark Knight|El caballero de la noche|El caballero oscuro": "https://www.youtube.com/watch?v=EXeTwQWrcwY",
  "The Matrix|Matrix": "https://www.youtube.com/watch?v=vKQi3bBA1y8"
  // "Street Fighter": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  // "Crawlers": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  // "Spirited Away|El viaje de Chihiro": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  // "Puro Mula": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
};
// ====== FIN DE LOS TRÁILERS ======

const API = (process.env.API_URL || API_URL).replace(/\/$/, "");
const token = process.env.TOKEN || TOKEN;
const simular = SIMULAR || process.env.SIMULAR === "1";
const dias = Number(process.env.DIAS || DIAS);
const TMDB = (process.env.TMDB_BASE || "https://api.themoviedb.org/3").replace(/\/$/, "");
const tmdbKey = process.env.TMDB_KEY || TMDB_KEY;

const call = async (method, url, body) => {
  if (simular && method !== "GET") return { ok: true, status: 200, d: null };
  const r = await fetch(API + url, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const lista = (d) => (Array.isArray(d) ? d : d?.rows || []);
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const redondear15 = (min) => Math.ceil(min / 15) * 15;
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
// Guatemala es UTC-6 todo el año (sin horario de verano)
const hoyGT = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const medianocheGT = (y, m, d) => Date.UTC(y, m - 1, d, 6, 0, 0);
const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de funciones.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }

  let salas = lista((await call("GET", "/rooms")).d);
  if (CINE) salas = salas.filter((s) => sinTildes(s.cinema?.name).includes(sinTildes(CINE)));
  if (salas.length === 0) { console.error("No hay salas" + (CINE ? ` del cine «${CINE}»` : "") + ". Crea las salas (con sus asientos) en el admin antes de generar funciones."); process.exit(1); }

  const elegibles = SOLO_PELICULAS.map(sinTildes);
  const peliculas = lista((await call("GET", "/movies")).d)
    .filter((m) => m.status !== false && Number(m.durationMinutes) > 0 && (elegibles.length === 0 || elegibles.includes(sinTildes(m.title))));
  if (peliculas.length === 0) { console.error("No hay películas activas con duración para programar."); process.exit(1); }
  const todas = lista((await call("GET", "/movies")).d);
  const duracion = new Map(todas.map((m) => [m.id, Number(m.durationMinutes) || 120]));

  // 0) Tráilers
  if (ACTUALIZAR_TRAILERS) {
    console.log("Tráilers");
    const manual = new Map();
    for (const [k, v] of Object.entries(TRAILERS)) for (const alias of k.split("|")) manual.set(sinTildes(alias), v);
    for (const m of todas) {
      if (m.trailerUrl && !SOBRESCRIBIR_TRAILERS) continue;
      let url = manual.get(sinTildes(m.title)) || null, fuente = "a mano";
      if (!url && tmdbKey) {
        try {
          const anio = String(m.releaseDate || "").slice(0, 4);
          const q = (ruta, p) => fetch(`${TMDB}${ruta}?${new URLSearchParams({ api_key: tmdbKey, ...p })}`).then((r) => { if (!r.ok) throw new Error("TMDB " + r.status); return r.json(); });
          const hit = ((await q("/search/movie", { query: m.title, language: "es-MX", ...(anio ? { year: anio } : {}) })).results || [])[0];
          if (hit) {
            const vids = [...((await q(`/movie/${hit.id}/videos`, { language: "es-MX", include_video_language: "es,en" })).results || [])].filter((v) => v.site === "YouTube" && v.type === "Trailer");
            vids.sort((a, b) => (b.official - a.official) || ((b.iso_639_1 === "es") - (a.iso_639_1 === "es")));
            if (vids[0]) { url = `https://www.youtube.com/watch?v=${vids[0].key}`; fuente = "TMDB"; }
          }
        } catch (e) { console.log(`  FALLÓ ${m.title}: no se pudo consultar TMDB (${e.message})`); continue; }
      }
      if (!url) { console.log(`  --   ${m.title}: sin tráiler (agrégalo en TRAILERS${tmdbKey ? "" : " o pon TMDB_KEY"})`); continue; }
      const r = await call("PUT", `/movies/update/${m.id}`, { trailerUrl: url });
      console.log(`  ${r.ok ? "ok   " : "FALLÓ"} ${m.title} → ${url} (${fuente})`);
    }
    console.log("");
  }

  // Funciones que ya existen: por sala, para no empalmar ni repetir
  const ocupado = new Map(salas.map((s) => [s.id, []]));
  const diaConFunciones = new Set();
  for (const f of lista((await call("GET", "/shows")).d)) {
    if (!ocupado.has(f.roomId)) continue;
    diaConFunciones.add(`${f.roomId}|${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(f.showDatetime))}`);
    const ini = new Date(f.showDatetime).getTime();
    ocupado.get(f.roomId).push([ini - LIMPIEZA_MIN * 60000, ini + (duracion.get(f.movieId) || 120) * 60000 + LIMPIEZA_MIN * 60000]);
  }

  console.log(`${peliculas.length} película(s), ${salas.length} sala(s), ${dias} día(s) desde mañana.${simular ? " (SIMULACIÓN: no se guarda nada)" : ""}`);
  const [Y, M, D] = hoyGT().split("-").map(Number);

  // 1) Se calcula el plan completo
  const plan = [];
  for (let d = 1; d <= dias; d++) {
    const base = medianocheGT(Y, M, D + d);
    const dia = new Date(Date.UTC(Y, M - 1, D + d));
    const dow = dia.getUTCDay();
    const fecha = dia.toISOString().slice(0, 10);
    const finDeSemana = dow === 0 || dow === 5 || dow === 6;
    salas.forEach((sala, si) => {
      if (!REPROGRAMAR_DIAS_CON_FUNCIONES && diaConFunciones.has(`${sala.id}|${fecha}`)) return;
      let t = aMin(PRIMERA_FUNCION);
      let k = si * 3 + d * 2; // desfase: cada sala y cada día arrancan con otra película
      let n = 0, vueltas = 0;
      while (t <= aMin(ULTIMA_FUNCION) && vueltas++ < 60) {
        // siguiente película de la rotación que ya esté estrenada ese día
        let m = null;
        for (let j = 0; j < peliculas.length; j++) {
          const c = peliculas[(k + j) % peliculas.length];
          if (!c.releaseDate || String(c.releaseDate).slice(0, 10) <= fecha) { m = c; k += j + 1; break; }
        }
        if (!m) break;
        const dur = Number(m.durationMinutes);
        const ini = base + t * 60000, fin = ini + dur * 60000;
        const choca = ocupado.get(sala.id).find(([a, b]) => ini < b && fin + LIMPIEZA_MIN * 60000 > a);
        if (choca) { t = Math.max(t + 15, redondear15(Math.ceil((choca[1] - base) / 60000))); continue; } // ya hay algo ahí: se salta
        const precio = (finDeSemana ? PRECIO_FIN_DE_SEMANA : PRECIO_SEMANA) - (t < 15 * 60 ? DESCUENTO_MATINE : 0);
        const formato = m.originalLanguage === "es" ? "español" : (n % 2 === 0 ? "subtitulada" : "doblada");
        plan.push({ fecha, dow, sala, m, ini, hora: hhmm(t), precio, formato });
        ocupado.get(sala.id).push([ini - LIMPIEZA_MIN * 60000, fin + LIMPIEZA_MIN * 60000]);
        t = redondear15(t + dur + LIMPIEZA_MIN);
        n++;
      }
    });
  }
  if (plan.length === 0) { console.log("No hay nada nuevo que crear (ya está todo programado)."); return; }

  // 2) Se crean
  let creadas = 0, fallidas = 0, diaActual = "";
  const porPelicula = new Map();
  for (const f of plan) {
    if (f.fecha !== diaActual) { diaActual = f.fecha; console.log(`\n${DIA[f.dow]} ${f.fecha}`); }
    const r = await call("POST", "/shows/create/", {
      movieId: f.m.id, roomId: f.sala.id, showDatetime: new Date(f.ini).toISOString(),
      basePrice: f.precio, format: f.formato, status: true
    });
    const donde = `${f.sala.cinema?.name ? f.sala.cinema.name + " · " : ""}${f.sala.name}`;
    console.log(`  ${r.ok ? "ok   " : "FALLÓ"} ${f.hora}  ${f.m.title} — ${donde} — Q${f.precio} — ${f.formato}${r.ok ? "" : " → " + (r.d?.message || r.status)}`);
    if (r.ok) { creadas++; porPelicula.set(f.m.title, (porPelicula.get(f.m.title) || 0) + 1); } else fallidas++;
  }
  console.log(`\nListo. Funciones ${simular ? "que se crearían" : "creadas"}: ${creadas}${fallidas ? `, fallidas: ${fallidas}` : ""}.`);
  console.log([...porPelicula].map(([t, n]) => `  ${t}: ${n}`).join("\n"));
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
