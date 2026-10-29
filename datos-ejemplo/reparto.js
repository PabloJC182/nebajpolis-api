// Uso:  1) pega tu token (y tu clave de TMDB) abajo   2) en la terminal de VS Code:  node reparto.js
// Agrega el REPARTO (director + actores con el nombre de su personaje) a las películas que YA existen en tu base.
// - Películas reales: busca por título en TMDB y trae director, actores, personaje, foto, fecha de nacimiento y biografía.
// - Películas inventadas o que TMDB no encuentre: escribe el reparto a mano en REPARTO_MANUAL (más abajo).
// No duplica: si una persona ya existe se reutiliza, y si una película ya tiene reparto se deja como está.
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";

// Clave gratuita de TMDB (themoviedb.org → Configuración → API → "Clave de API (v3 auth)"). Sin ella solo se usa REPARTO_MANUAL.
const TMDB_KEY = "";

const CANTIDAD_ACTORES = 8;   // cuántos actores traer por película (los de mayor protagonismo)
const COMPLETAR = false;      // false = salta las películas que ya tienen reparto. true = agrega a las que faltan aunque ya tengan algo
const SIMULAR = false;        // true = solo muestra qué haría, sin guardar nada (recomendado la primera vez)

// ====== REPARTO A MANO (por título de la película; con "|" puedes poner otros nombres de la misma, ej. en español) ======
// rol: "Director" o el nombre del personaje. Opcionales por persona: foto (https), nacimiento ("1980-01-31"), bio.
// Si en tu base una película se llama distinto, agrega su nombre separado con "|" al inicio de su bloque.
const REPARTO_MANUAL = {
  "Street Fighter": [
    { nombre: "Kitao Sakurai", rol: "Director" },
    { nombre: "Andrew Koji", rol: "Ryu" },
    { nombre: "Noah Centineo", rol: "Ken Masters" },
    { nombre: "Callina Liang", rol: "Chun-Li" },
    { nombre: "David Dastmalchian", rol: "M. Bison" },
    { nombre: "Jason Momoa", rol: "Blanka" },
    { nombre: "Joe Anoa'i (Roman Reigns)", rol: "Akuma" },
    { nombre: "Cody Rhodes", rol: "Guile" },
    { nombre: "Curtis \"50 Cent\" Jackson", rol: "Balrog" },
    { nombre: "Orville Peck", rol: "Vega" },
    { nombre: "Melanie Jarnson", rol: "Cammy" },
    { nombre: "Vidyut Jammwal", rol: "Dhalsim" },
    { nombre: "Olivier Richters", rol: "Zangief" },
    { nombre: "Hirooki Goto", rol: "E. Honda" },
    { nombre: "Andrew Schulz", rol: "Dan Hibiki" },
    { nombre: "Eric André", rol: "Don Sauvage" },
    { nombre: "Rayna Vallandingham", rol: "Juli" },
    { nombre: "Alexander Volkanovski", rol: "Joe" },
    { nombre: "Kyle Mooney", rol: "Marvin" }
  ],
  "Whalefall": [
    { nombre: "Brian Duffield", rol: "Director" },
    { nombre: "Austin Abrams", rol: "Jay Gardiner" },
    { nombre: "Josh Brolin", rol: "Mitt Gardiner" },
    { nombre: "Elisabeth Shue", rol: "Zara Gardiner" },
    { nombre: "Jane Levy", rol: "Eva Gardiner" },
    { nombre: "Emily Rudd", rol: "Nan Gardiner" },
    { nombre: "John Ortiz", rol: "Hewey" }
  ],
  "Sense and Sensibility|Sentido y sensibilidad|Razón y sentimiento|Sense & Sensibility": [
    { nombre: "Georgia Oakley", rol: "Director" },
    { nombre: "Daisy Edgar-Jones", rol: "Elinor Dashwood" },
    { nombre: "Esmé Creed-Miles", rol: "Marianne Dashwood" },
    { nombre: "Caitríona Balfe", rol: "Sra. Dashwood" },
    { nombre: "Frank Dillane", rol: "John Willoughby" },
    { nombre: "George MacKay", rol: "Edward Ferrars" },
    { nombre: "Fiona Shaw", rol: "Sra. Jennings" },
    { nombre: "Herbert Nordrum", rol: "Coronel Brandon" },
    { nombre: "Bodhi Rae Breathnach", rol: "Margaret Dashwood" },
    { nombre: "Stacy Martin", rol: "Fanny Dashwood" }
  ],
  "Crawlers|Crawler": [
    { nombre: "Ángel Gómez Hernández", rol: "Director" },
    { nombre: "Matilda Lutz", rol: "Serena" },
    { nombre: "Gregg Sulkin", rol: "Actor" },
    { nombre: "Lea Vivier", rol: "Jalene" },
    { nombre: "Elena Sanz", rol: "Callan" },
    { nombre: "Melina Matthews", rol: "Lady Lash" },
    { nombre: "Andrea Scott Méndez", rol: "Molly" },
    { nombre: "Paul S. Tracey", rol: "Paul" },
    { nombre: "Chris Rogers", rol: "George" },
    { nombre: "Gary Anthony Stennette", rol: "Dr. Woodward" },
    { nombre: "William Miller", rol: "Actor" }
  ],
  "Spirited Away|El viaje de Chihiro|Chihiro": [
    { nombre: "Hayao Miyazaki", rol: "Director" },
    { nombre: "Rumi Hiiragi", rol: "Chihiro (voz)" },
    { nombre: "Miyu Irino", rol: "Haku (voz)" },
    { nombre: "Mari Natsuki", rol: "Yubaba y Zeniba (voz)" },
    { nombre: "Bunta Sugawara", rol: "Kamajī (voz)" },
    { nombre: "Takashi Naitō", rol: "Akio, padre de Chihiro (voz)" },
    { nombre: "Yasuko Sawaguchi", rol: "Yūko, madre de Chihiro (voz)" },
    { nombre: "Ryūnosuke Kamiki", rol: "Bō (voz)" },
    { nombre: "Yumi Tamai", rol: "Lin (voz)" },
    { nombre: "Akio Nakamura", rol: "Sin Cara / Kaonashi (voz)" }
  ],
  "Puro Mula": [
    { nombre: "Enrique Pérez Him", rol: "Director" },
    { nombre: "Domingo Lemus", rol: "Joel Fonseca" },
    { nombre: "Gretchen Barneond", rol: "Maritza" },
    { nombre: "Daneri Gudiel", rol: "Pepino" },
    { nombre: "Cesia \"La China\" Godoy", rol: "Sandra" },
    { nombre: "Roberto Díaz Gomar", rol: "El Viejito" },
    { nombre: "Brenda Lara", rol: "Matilde" },
    { nombre: "Jairón Salguero", rol: "Robles" },
    { nombre: "Diego Tarragó", rol: "El Niño" }
  ],
  "Interstellar": [
    { nombre: "Christopher Nolan", rol: "Director" },
    { nombre: "Matthew McConaughey", rol: "Joseph Cooper" },
    { nombre: "Anne Hathaway", rol: "Dra. Amelia Brand" },
    { nombre: "Jessica Chastain", rol: "Murph Cooper (adulta)" },
    { nombre: "Mackenzie Foy", rol: "Murph Cooper (niña)" },
    { nombre: "Michael Caine", rol: "Profesor Brand" },
    { nombre: "Casey Affleck", rol: "Tom Cooper" },
    { nombre: "Matt Damon", rol: "Dr. Mann" },
    { nombre: "Wes Bentley", rol: "Doyle" },
    { nombre: "David Gyasi", rol: "Romilly" },
    { nombre: "Topher Grace", rol: "Getty" },
    { nombre: "John Lithgow", rol: "Donald" }
  ],
  "Inception|El origen|Origen": [
    { nombre: "Christopher Nolan", rol: "Director" },
    { nombre: "Leonardo DiCaprio", rol: "Dom Cobb" },
    { nombre: "Joseph Gordon-Levitt", rol: "Arthur" },
    { nombre: "Elliot Page", rol: "Ariadne" },
    { nombre: "Tom Hardy", rol: "Eames" },
    { nombre: "Ken Watanabe", rol: "Saito" },
    { nombre: "Cillian Murphy", rol: "Robert Fischer" },
    { nombre: "Marion Cotillard", rol: "Mal Cobb" },
    { nombre: "Michael Caine", rol: "Profesor Miles" },
    { nombre: "Tom Berenger", rol: "Browning" },
    { nombre: "Dileep Rao", rol: "Yusuf" }
  ],
  "The Dark Knight|El caballero de la noche|El caballero oscuro|Batman: El caballero de la noche": [
    { nombre: "Christopher Nolan", rol: "Director" },
    { nombre: "Christian Bale", rol: "Bruce Wayne / Batman" },
    { nombre: "Heath Ledger", rol: "El Joker" },
    { nombre: "Aaron Eckhart", rol: "Harvey Dent / Dos Caras" },
    { nombre: "Michael Caine", rol: "Alfred Pennyworth" },
    { nombre: "Maggie Gyllenhaal", rol: "Rachel Dawes" },
    { nombre: "Gary Oldman", rol: "Jim Gordon" },
    { nombre: "Morgan Freeman", rol: "Lucius Fox" }
  ],
  "The Matrix|Matrix|Matrix (1999)": [
    { nombre: "Lana Wachowski", rol: "Director" },
    { nombre: "Lilly Wachowski", rol: "Director" },
    { nombre: "Keanu Reeves", rol: "Neo" },
    { nombre: "Laurence Fishburne", rol: "Morfeo" },
    { nombre: "Carrie-Anne Moss", rol: "Trinity" },
    { nombre: "Hugo Weaving", rol: "Agente Smith" },
    { nombre: "Joe Pantoliano", rol: "Cypher" },
    { nombre: "Gloria Foster", rol: "El Oráculo" }
  ]
};
// ====== FIN DEL REPARTO A MANO ======

const API = (process.env.API_URL || API_URL).replace(/\/$/, "");
const TMDB = (process.env.TMDB_BASE || "https://api.themoviedb.org/3").replace(/\/$/, "");
const IMG = (process.env.TMDB_IMG || "https://image.tmdb.org/t/p").replace(/\/$/, "");
const token = process.env.TOKEN || TOKEN;
const tmdbKey = process.env.TMDB_KEY || TMDB_KEY;
const simular = SIMULAR || process.env.SIMULAR === "1";

const call = async (method, url, body) => {
  if (simular && method !== "GET") return { ok: true, status: 200, d: { id: 0 } };
  const r = await fetch(API + url, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const tmdb = async (ruta, params = {}) => {
  const q = new URLSearchParams({ api_key: tmdbKey, language: "es-MX", ...params });
  const r = await fetch(`${TMDB}${ruta}?${q}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
};
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const lista = (d) => (Array.isArray(d) ? d : d?.rows || []);
const log = (ok, txt) => console.log((ok ? "  ok   " : "  FALLÓ ") + (simular && ok ? "(simulado) " : "") + txt);

// Reparto de una película desde TMDB: [{ nombre, rol, foto, tmdbId }]
async function repartoTmdb(m) {
  const anio = String(m.releaseDate || "").slice(0, 4);
  const busq = await tmdb("/search/movie", { query: m.title, include_adult: "false", ...(anio ? { year: anio } : {}) });
  const hit = (busq.results || [])[0];
  if (!hit) return null;
  const cred = await tmdb(`/movie/${hit.id}/credits`);
  const dir = (cred.crew || []).find((c) => c.job === "Director");
  const gente = [];
  if (dir) gente.push({ nombre: dir.name, rol: "Director", foto: dir.profile_path, tmdbId: dir.id });
  for (const a of (cred.cast || []).slice(0, CANTIDAD_ACTORES)) {
    const personaje = String(a.character || "").split("/")[0].replace(/\(.*?\)/g, "").trim();
    gente.push({ nombre: a.name, rol: personaje || "Actor", foto: a.profile_path, tmdbId: a.id });
  }
  return gente;
}
async function detallesTmdb(id) {
  try { const p = await tmdb(`/person/${id}`); return { nacimiento: p.birthday || undefined, bio: (p.biography || "").slice(0, 1500) || undefined }; } catch { return {}; }
}

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de reparto.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }
  if (!tmdbKey) console.log("(sin TMDB_KEY: solo se usa REPARTO_MANUAL)");

  const personas = new Map(lista((await call("GET", "/persons")).d).map((p) => [sinTildes(p.fullName), p.id]));
  const manual = new Map();
  for (const [k, v] of Object.entries(REPARTO_MANUAL)) for (const alias of k.split("|")) manual.set(sinTildes(alias), v);
  const peliculas = lista((await call("GET", "/movies")).d);
  let creadas = 0, vinculos = 0;

  for (const base of peliculas) {
    const m = (await call("GET", `/movies/${base.id}`)).d || base;
    const actuales = m.people ?? m.persons ?? [];
    console.log(`${m.title}`);
    if (actuales.length > 0 && !COMPLETAR) { console.log(`  --   ya tiene reparto (${actuales.length}), se deja igual`); continue; }
    const yaEsta = new Set(actuales.map((p) => sinTildes(p.fullName)));

    let gente = manual.get(sinTildes(m.title)) ?? null;
    let fuente = "a mano";
    if (!gente && tmdbKey) {
      try { gente = await repartoTmdb(m); fuente = "TMDB"; } catch (e) { console.log(`  FALLÓ no se pudo consultar TMDB (${e.message}). ¿Clave incorrecta?`); continue; }
    }
    if (!gente || gente.length === 0) { console.log("  --   sin reparto: no está en REPARTO_MANUAL" + (tmdbKey ? " y TMDB no la encontró" : "")); continue; }

    for (const g of gente) {
      const clave = sinTildes(g.nombre);
      if (yaEsta.has(clave)) continue;
      let pid = personas.get(clave);
      if (!pid) {
        const extra = g.tmdbId ? await detallesTmdb(g.tmdbId) : {};
        const body = { fullName: g.nombre, photoUrl: g.foto ? (String(g.foto).startsWith("http") ? g.foto : `${IMG}/w185${g.foto}`) : (g.fotoUrl || ""), birthDate: g.nacimiento || extra.nacimiento || null, biography: g.bio || extra.bio || null };
        const r = await call("POST", "/persons/create/", body);
        if (!r.ok) { log(false, `crear persona ${g.nombre} → ${r.d?.message}`); continue; }
        pid = r.d.id; personas.set(clave, pid); creadas++;
      }
      const r = await call("POST", `/movies/${m.id}/cast`, { personId: pid, role: g.rol });
      if (r.ok) vinculos++;
      log(r.ok, `${g.nombre} — ${g.rol} (${fuente})${r.ok ? "" : " → " + r.d?.message}`);
    }
  }
  console.log(`Listo. Personas nuevas: ${creadas}. Asignaciones al reparto: ${vinculos}.`);
})();
