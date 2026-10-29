// Uso:  1) pega tu token abajo   2) en la terminal de VS Code:  node fotos.js
// Pone fotos reales a la comida, los combos, los banners y las películas que YA existen en tu base de datos,
// sin borrar nada (no se pierden ventas, combos ni inventario). Reconoce los productos por palabras del nombre
// ("palomitas grandes", "gaseosa", "perro caliente", "café"...), así que NO importa cómo los hayas llamado.
// Se puede correr varias veces.
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";

// Películas: si pegas una clave gratuita de TMDB, el script busca por título el póster vertical y el fondo
// horizontal (backdrop) de CADA película y los guarda. Cómo obtenerla (2 min): crea cuenta en themoviedb.org →
// Configuración → API → "Clave de API (v3 auth)". Déjala vacía ("") si no quieres tocar las películas.
const TMDB_KEY = "";

// Qué actualizar (quita lo que no quieras)
const CARGAR = ["comida", "combos", "banners", "peliculas"];

// true = reemplaza TODAS las fotos (también las que ya tengan una imagen). false = solo las vacías o de relleno (placehold.co)
const SOBRESCRIBIR = true;

// true = solo muestra qué cambiaría, sin guardar nada. Úsalo primero para revisar, luego ponlo en false.
const SIMULAR = false;

// ====== FOTOS (gratis, licencia Unsplash). Cambia cualquiera por la tuya: cualquier https que abra la imagen ======
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=entropy&q=80&w=${w}&h=${h}`;
const CUADRADA = (id) => U(id, 800, 800);   // comida y combos
const BANNER = (id) => U(id, 1920, 640);    // banners del inicio (3:1)

const FOTOS = {
  comida: {
    "Palomitas Pequeñas": CUADRADA("1512204231446-d520ee0a0873"),
    "Palomitas Medianas": CUADRADA("1691480213129-106b2c7d1ee8"),
    "Palomitas Grandes": CUADRADA("1768851062753-4face8de185c"),
    "Nachos con Queso": CUADRADA("1684353763409-9567253bd218"),
    "Hot Dog": CUADRADA("1638368593249-7cadb261e8b3"),
    "Refresco Mediano": CUADRADA("1533007716222-4b465613a984"),
    "Refresco Grande": CUADRADA("1533007716222-4b465613a984"),
    "Agua Pura": CUADRADA("1561041695-d2fadf9f318c"),
    "Chocolate M&M": CUADRADA("1606797020447-cf605fc9e408"),
    "Gomitas": CUADRADA("1728032470288-e9926a2bc2c5"),
    "Café Americano": CUADRADA("1640735099606-8181a8c8f5a7")
  },
  combos: {
    "Combo Individual": U("1738708387940-ff9b5f673c29", 1200, 800),
    "Combo Pareja": U("1598899134739-24c46f58b8c0", 1200, 800),
    "Combo Amigos": U("1691480213129-106b2c7d1ee8", 1200, 800),
    "Combo Familiar": U("1768851062753-4face8de185c", 1200, 800)
  },
  banners: {
    "Estrenos de la semana": BANNER("1595769816263-9b910be24d5f"),
    "Combos para toda la familia": BANNER("1598899134739-24c46f58b8c0"),
    "Martes de descuento": BANNER("1717915604557-94283edbcc1b")
  },
  // Películas a mano (por título exacto). Tiene prioridad sobre TMDB. posterUrl = vertical 2:3, backdropUrl = horizontal 16:9
  peliculas: {
    // "Street Fighter": { posterUrl: "https://...", backdropUrl: "https://..." },
  }
};
// ====== FIN DE LAS FOTOS ======

// ====== REGLAS: cómo se reconoce cada producto por su nombre (sin importar mayúsculas ni tildes) ======
// Se prueban en orden; gana la primera que coincida. Si ninguna coincide, se usa la categoría.
const REGLAS_COMIDA = [
  [/palomit|pop ?corn|canguil/, (n) => (/peque|chic|person|small|\bs\b/.test(n) ? "Palomitas Pequeñas" : /grand|famil|jumbo|large|\bl\b/.test(n) ? "Palomitas Grandes" : "Palomitas Medianas")],
  [/nacho/, () => "Nachos con Queso"],
  [/hot ?dog|perro|salchicha/, () => "Hot Dog"],
  [/caf[e]|capuch|latte|espresso|moca/, () => "Café Americano"],
  [/agua|water/, () => "Agua Pura"],
  [/refresco|gaseosa|soda|cola|pepsi|sprite|fanta|bebida|jugo|limonada|te frio|energi/, (n) => (/grand|large|\bl\b|\b2[0-9] ?oz/.test(n) ? "Refresco Grande" : "Refresco Mediano")],
  [/chocolate|m ?& ?m|m&m|snickers|barra|galleta|brownie/, () => "Chocolate M&M"],
  [/gomit|gusan|caramel|dulce|chicle|paleta|gummy/, () => "Gomitas"]
];
const POR_CATEGORIA = [[/snack|botana|comida|salad/, "Palomitas Medianas"], [/bebida|drink/, "Refresco Mediano"], [/dulce|candy|golosina/, "Gomitas"]];
const REGLAS_COMBO = [[/individual|solo|personal/, "Combo Individual"], [/pareja|duo|dos personas|2 personas/, "Combo Pareja"], [/amigos|grupo/, "Combo Amigos"], [/famil/, "Combo Familiar"]];
const REGLAS_BANNER = [[/estren|nuev|cartelera|pelicula/, "Estrenos de la semana"], [/combo|dulcer|palomit|comida/, "Combos para toda la familia"], [/martes|descuento|promo|2x1|oferta/, "Martes de descuento"]];
// ====== FIN DE LAS REGLAS ======

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const elegir = (nombre, reglas, fotos, categoria) => {
  const n = sinTildes(nombre);
  if (fotos.has(n)) return fotos.get(n); // nombre exacto
  for (const [re, clave] of reglas) if (re.test(n)) { const k = typeof clave === "function" ? clave(n) : clave; return fotos.get(sinTildes(k)); }
  if (categoria) { const c = sinTildes(categoria); for (const [re, k] of POR_CATEGORIA) if (re.test(c)) return fotos.get(sinTildes(k)); }
  return null;
};


const API = (process.env.API_URL || API_URL).replace(/\/$/, "");
const TMDB = (process.env.TMDB_BASE || "https://api.themoviedb.org/3").replace(/\/$/, "");
const TMDB_IMG = (process.env.TMDB_IMG || "https://image.tmdb.org/t/p").replace(/\/$/, "");
const token = process.env.TOKEN || TOKEN;
const tmdbKey = process.env.TMDB_KEY || TMDB_KEY;
const solo = CARGAR;
const sobrescribir = SOBRESCRIBIR || process.env.SOBRESCRIBIR === "1";

const call = async (method, url, body) => {
  if (SIMULAR && method !== "GET") return { ok: true, status: 200, d: null };
  const r = await fetch(API + url, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const log = (ok, txt) => console.log((ok ? "  ok   " : "  FALLÓ ") + (SIMULAR && ok ? "(simulado) " : "") + txt);
const sin = (txt) => console.log("  --   sin foto asignada: " + txt);
const norm = sinTildes;
const necesita = (actual) => sobrescribir || !actual || /placehold\.co/.test(actual);
const lista = (d) => (Array.isArray(d) ? d : d?.rows || []);

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de fotos.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }

  const porNombre = (mapa) => { const m = new Map(); for (const [k, v] of Object.entries(mapa)) m.set(norm(k), v); return m; };

  if (solo.includes("comida")) {
    console.log("Comida");
    const fotos = porNombre(FOTOS.comida);
    for (const it of lista((await call("GET", "/food/todos")).d)) {
      const url = elegir(it.name, REGLAS_COMIDA, fotos, it.category);
      if (!url) { sin(`${it.name} (ponla a mano en el admin)`); continue; }
      if (!necesita(it.imageUrl)) { log(true, `${it.name} ya tiene foto`); continue; }
      const r = await call("PUT", `/food/update/${it.id}`, { imageUrl: url }); log(r.ok, it.name);
    }
  }

  if (solo.includes("combos")) {
    console.log("Combos");
    const fotos = porNombre(FOTOS.combos);
    for (const c of lista((await call("GET", "/combos/todos")).d)) {
      const url = elegir(c.name, REGLAS_COMBO, fotos);
      if (!url) { sin(`${c.name} (ponla a mano en el admin)`); continue; }
      if (!necesita(c.imageUrl)) { log(true, `${c.name} ya tiene foto`); continue; }
      // el endpoint de combos pide el combo completo, así que se reenvía lo que ya tiene
      const body = { name: c.name, description: c.description, imageUrl: url, ticketQty: c.ticketQty, price: c.price, validFrom: c.validFrom, validTo: c.validTo, status: c.status,
        items: (c.items || []).map((i) => ({ foodItemId: i.foodItemId, quantity: i.quantity })) };
      const r = await call("PUT", `/combos/update/${c.id}`, body); log(r.ok, `${c.name}${r.ok ? "" : " → " + r.d?.message}`);
    }
  }

  if (solo.includes("banners")) {
    console.log("Banners");
    const fotos = porNombre(FOTOS.banners);
    const rotar = [...fotos.values()];
    let n = 0;
    for (const b of lista((await call("GET", "/banners/todos")).d)) {
      const url = elegir(b.title, REGLAS_BANNER, fotos) || rotar[n++ % rotar.length]; // si el título no dice nada, se asignan por orden
      if (!necesita(b.imageUrl)) { log(true, `${b.title} ya tiene foto`); continue; }
      const r = await call("PUT", `/banners/update/${b.id}`, { imageUrl: url }); log(r.ok, b.title);
    }
  }

  if (solo.includes("peliculas")) {
    console.log("Películas");
    const manual = porNombre(FOTOS.peliculas);
    if (!tmdbKey && manual.size === 0) console.log("  (sin TMDB_KEY ni películas a mano: se omiten. Mira las instrucciones al inicio del archivo)");
    else for (const m of lista((await call("GET", "/movies")).d)) {
      const falta = { poster: necesita(m.posterUrl), fondo: necesita(m.backdropUrl) };
      if (!falta.poster && !falta.fondo) { log(true, `${m.title} ya tiene póster y fondo`); continue; }
      let cambios = {};
      const a = manual.get(norm(m.title));
      if (a) cambios = { ...(a.posterUrl && falta.poster ? { posterUrl: a.posterUrl } : {}), ...(a.backdropUrl && falta.fondo ? { backdropUrl: a.backdropUrl } : {}) };
      else if (tmdbKey) {
        const anio = String(m.releaseDate || "").slice(0, 4);
        const q = `${TMDB}/search/movie?api_key=${encodeURIComponent(tmdbKey)}&language=es-MX&include_adult=false&query=${encodeURIComponent(m.title)}${anio ? "&year=" + anio : ""}`;
        let res = null;
        try { const r = await fetch(q); res = r.ok ? await r.json() : null; if (!r.ok) { log(false, `${m.title}: TMDB respondió ${r.status} (¿clave incorrecta?)`); continue; } } catch (e) { log(false, `${m.title}: no se pudo consultar TMDB`); continue; }
        const hit = (res?.results || []).find((x) => x.backdrop_path || x.poster_path);
        if (!hit) { log(false, `${m.title}: TMDB no encontró la película (ponla a mano en FOTOS.peliculas)`); continue; }
        if (falta.fondo && hit.backdrop_path) cambios.backdropUrl = `${TMDB_IMG}/w1280${hit.backdrop_path}`;
        if (falta.poster && hit.poster_path) cambios.posterUrl = `${TMDB_IMG}/w780${hit.poster_path}`;
      }
      if (Object.keys(cambios).length === 0) { log(false, `${m.title}: sin imágenes para poner`); continue; }
      const r = await call("PUT", `/movies/update/${m.id}`, cambios);
      log(r.ok, `${m.title} (${Object.keys(cambios).map((k) => (k === "posterUrl" ? "póster" : "fondo")).join(" + ")})`);
    }
  }
  console.log("Listo.");
})();
