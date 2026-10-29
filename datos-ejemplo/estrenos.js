// Uso:  1) pega tu token abajo (y, si quieres afiches/fotos automáticas, tu clave de TMDB)   2) en la terminal de VS Code:  node estrenos.js
// Crea 3 PRÓXIMOS ESTRENOS con todo lo relacionado, SIN FUNCIONES (así salen en "Próximamente", no en cartelera):
//   · Avengers: Doomsday         (18-dic-2026)
//   · Dune: Part Three           (18-dic-2026)
//   · The Hunger Games: Sunrise on the Reaping (20-nov-2026)
// Por película crea: la película (sinopsis, fecha, géneros, tráiler), las personas (director y reparto con su personaje) y las vincula.
// No duplica: si la película o una persona ya existe se reutiliza; solo se completa lo que falte (reparto, tráiler, afiche).
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";

// Opcional pero recomendado: clave gratuita de TMDB (themoviedb.org → Configuración → API → "Clave de API (v3 auth)").
// Con ella se llenan solos el afiche, el fondo (backdrop), la foto/biografía de cada persona y, si falta, el tráiler.
// Sin ella: las películas y el reparto se crean igual, pero SIN imágenes (pega los enlaces en "afiche"/"fondo" de abajo o desde el admin).
const TMDB_KEY = "";

// Tamaño de las imágenes que baja TMDB (siempre con la proporción correcta: afiche vertical 2:3, fondo horizontal 16:9).
// Afiche: "w500" | "w780" | "original".  Fondo: "w780" | "w1280" | "original" (original = 1920×1080 o más; pesa más pero se ve más nítido en el banner grande).
const TAMANO_AFICHE = "w780";
const TAMANO_FONDO = "original";

const SIMULAR = false; // true = solo muestra qué haría, sin guardar nada (recomendado la primera vez)

// ====== DATOS ======
// OJO con estos campos, no son oficiales todavía:
//  · duracion: los estudios aún no la publican → es un ESTIMADO (cámbialo en el admin cuando salga).
//  · clasificacion: ajusta a la que use tu cine.
//  · tráiler: Doomsday (irVNGjRFZGk) lo confirmé en dos notas de prensa; Dune 3 (NdvqHc56lE0) solo en una → abre el enlace para confirmar.
//    Hunger Games no pude confirmarlo: lo trae TMDB si pones tu clave, o pégalo en "trailer".
// Los "fondo" de abajo son enlaces que pasaste tú (Doomsday: banner hecho por un fan; Dune: miniatura de Google). Sin "afiche" vertical: pon TMDB_KEY o pega uno.
const PELICULAS = [
  {
    titulo: "Avengers: Doomsday",
    estreno: "2026-12-18",
    duracion: 150, // estimado
    clasificacion: "B15",
    idioma: "en",
    generos: ["Acción", "Ciencia ficción", "Aventura"],
    sinopsis: "Los Vengadores, los héroes de Wakanda y los Nuevos Vengadores unen fuerzas con los Cuatro Fantásticos y los X-Men originales para enfrentar a la mayor amenaza que ha visto el multiverso: el todopoderoso Doctor Doom.",
    trailer: "https://www.youtube.com/watch?v=irVNGjRFZGk",
    afiche: "", // https://... (si lo dejas vacío y pones TMDB_KEY, se llena solo)
    fondo: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/2e317a1c-f1ce-4a5f-90db-d88cc01db2d0/dly9dsp-fc2b9d39-4c06-4310-8f66-a07ff7b878a7.png/v1/fill/w_1280,h_487,q_80,strp/avengers_doomsday_banner_4k_2026_by_mrandrew7w7_dly9dsp-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NDg3IiwicGF0aCI6Ii9mLzJlMzE3YTFjLWYxY2UtNGE1Zi05MGRiLWQ4OGNjMDFkYjJkMC9kbHk5ZHNwLWZjMmI5ZDM5LTRjMDYtNDMxMC04ZjY2LWEwN2ZmN2I4NzhhNy5wbmciLCJ3aWR0aCI6Ijw9MTI4MCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.lRyBeHyAIDmApkzkDKibvGfmdQ2BORd1YuEOyoXC2ps",
    reparto: [
      { nombre: "Anthony Russo", rol: "Director" },
      { nombre: "Joe Russo", rol: "Director" },
      { nombre: "Robert Downey Jr.", rol: "Victor von Doom / Doctor Doom" },
      { nombre: "Chris Evans", rol: "Steve Rogers" },
      { nombre: "Chris Hemsworth", rol: "Thor" },
      { nombre: "Anthony Mackie", rol: "Sam Wilson / Capitán América" },
      { nombre: "Pedro Pascal", rol: "Reed Richards / Mister Fantástico" },
      { nombre: "Vanessa Kirby", rol: "Sue Storm / Mujer Invisible" },
      { nombre: "Joseph Quinn", rol: "Johnny Storm / Antorcha Humana" },
      { nombre: "Ebon Moss-Bachrach", rol: "Ben Grimm / La Mole" },
      { nombre: "Paul Rudd", rol: "Scott Lang / Ant-Man" },
      { nombre: "Florence Pugh", rol: "Yelena Belova" },
      { nombre: "Sebastian Stan", rol: "Bucky Barnes / Soldado del Invierno" },
      { nombre: "Tom Hiddleston", rol: "Loki" },
      { nombre: "Simu Liu", rol: "Xu Shang-Chi" },
      { nombre: "Letitia Wright", rol: "Shuri / Pantera Negra" },
      { nombre: "Winston Duke", rol: "M'Baku" },
      { nombre: "Tenoch Huerta", rol: "Namor" },
      { nombre: "Wyatt Russell", rol: "John Walker / U.S. Agent" },
      { nombre: "David Harbour", rol: "Alexei Shostakov / Red Guardian" },
      { nombre: "Danny Ramirez", rol: "Joaquin Torres / Falcon" },
      { nombre: "Lewis Pullman", rol: "Bob Reynolds / Sentry" },
      { nombre: "Hannah John-Kamen", rol: "Ava Starr / Ghost" },
      { nombre: "Patrick Stewart", rol: "Charles Xavier / Profesor X" },
      { nombre: "Ian McKellen", rol: "Erik Lehnsherr / Magneto" },
      { nombre: "James Marsden", rol: "Scott Summers / Cyclops" },
      { nombre: "Kelsey Grammer", rol: "Hank McCoy / Bestia" },
      { nombre: "Alan Cumming", rol: "Kurt Wagner / Nightcrawler" },
      { nombre: "Rebecca Romijn", rol: "Raven Darkhölme / Mystique" },
      { nombre: "Channing Tatum", rol: "Remy LeBeau / Gambito" }
    ]
  },
  {
    titulo: "Dune: Part Three",
    estreno: "2026-12-18",
    duracion: 165, // estimado
    clasificacion: "B12",
    idioma: "en",
    generos: ["Ciencia ficción", "Aventura", "Drama"],
    sinopsis: "Diecisiete años después de la batalla por Arrakis, Paul Atreides gobierna como emperador mientras la guerra santa se extiende por el universo. Entre conspiraciones y viejos aliados que dudan de él, Paul enfrentará el precio del poder en el cierre de la trilogía de Denis Villeneuve, basada en «Dune Messiah».",
    trailer: "https://www.youtube.com/watch?v=NdvqHc56lE0",
    afiche: "",
    fondo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdc50twyHu8kKB3pejGc3o4wjCwa0aCL9F5STmALs_XQ&s=10",
    reparto: [
      { nombre: "Denis Villeneuve", rol: "Director" },
      { nombre: "Timothée Chalamet", rol: "Paul Atreides" },
      { nombre: "Zendaya", rol: "Chani" },
      { nombre: "Rebecca Ferguson", rol: "Lady Jessica" },
      { nombre: "Florence Pugh", rol: "Irulan" },
      { nombre: "Anya Taylor-Joy", rol: "Alia Atreides" },
      { nombre: "Jason Momoa", rol: "Hayt (ghola de Duncan Idaho)" },
      { nombre: "Robert Pattinson", rol: "Scytale" },
      { nombre: "Javier Bardem", rol: "Stilgar" },
      { nombre: "Josh Brolin", rol: "Gurney Halleck" },
      { nombre: "Charlotte Rampling", rol: "Reverenda Madre Mohiam" },
      { nombre: "Isaach de Bankolé", rol: "Farok" },
      { nombre: "Nakoa-Wolf Momoa", rol: "Leto II Atreides" },
      { nombre: "Ida Brooke", rol: "Ghanima Atreides" }
    ]
  },
  {
    titulo: "The Hunger Games: Sunrise on the Reaping",
    estreno: "2026-11-20",
    duracion: 140, // estimado
    clasificacion: "B15",
    idioma: "en",
    generos: ["Ciencia ficción", "Drama", "Acción"],
    sinopsis: "Veinticuatro años antes de Katniss, el joven Haymitch Abernathy es elegido para los Segundos Juegos del Hambre del Vasallaje, en los que cada distrito envía el doble de tributos. Para sobrevivir a la arena y a las manipulaciones del Capitolio, Haymitch tendrá que luchar por quienes ama, entre ellos Lenore Dove.",
    trailer: "", // si dejas vacío y pones TMDB_KEY, se busca solo
    afiche: "",
    fondo: "https://thefutureoftheforce.com/wp-content/uploads/2025/11/The-Hunger-Games-Sunshine-on-the-Reaping-Header-Official-FUTURE-OF-THE-FORCE.jpg",
    reparto: [
      { nombre: "Francis Lawrence", rol: "Director" },
      { nombre: "Joseph Zada", rol: "Haymitch Abernathy" },
      { nombre: "Ralph Fiennes", rol: "Presidente Coriolanus Snow" },
      { nombre: "Glenn Close", rol: "Drusilla Sickle" },
      { nombre: "Elle Fanning", rol: "Effie Trinket" },
      { nombre: "Kieran Culkin", rol: "Caesar Flickerman" },
      { nombre: "Jesse Plemons", rol: "Plutarch Heavensbee (joven)" },
      { nombre: "Kelvin Harrison Jr.", rol: "Beetee" },
      { nombre: "Maya Hawke", rol: "Wiress" },
      { nombre: "Lili Taylor", rol: "Mags" },
      { nombre: "Billy Porter", rol: "Magno Stift" },
      { nombre: "McKenna Grace", rol: "Maysilee Donner" },
      { nombre: "Whitney Peak", rol: "Lenore Dove Baird" },
      { nombre: "Ben Wang", rol: "Wyatt Callow" },
      { nombre: "Molly McCann", rol: "Louella" },
      { nombre: "Iona Bell", rol: "Lou Lou" }
    ]
  }
];
// ====== FIN DE LOS DATOS ======

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
  const r = await fetch(`${TMDB}${ruta}?${new URLSearchParams({ api_key: tmdbKey, language: "es-MX", ...params })}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
};
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const lista = (d) => (Array.isArray(d) ? d : d?.rows || []);
const log = (ok, txt) => console.log((ok ? "  ok   " : "  FALLÓ ") + (simular && ok ? "(simulado) " : "") + txt);

// Afiche, fondo y tráiler de la película desde TMDB (todo opcional)
async function datosTmdbPelicula(p) {
  try {
    const hit = ((await tmdb("/search/movie", { query: p.titulo, year: p.estreno.slice(0, 4), include_adult: "false" })).results || [])[0]
      || ((await tmdb("/search/movie", { query: p.titulo, include_adult: "false" })).results || [])[0];
    if (!hit) return {};
    const out = { afiche: hit.poster_path ? `${IMG}/${TAMANO_AFICHE}${hit.poster_path}` : "", fondo: hit.backdrop_path ? `${IMG}/${TAMANO_FONDO}${hit.backdrop_path}` : "" };
    const vids = ((await tmdb(`/movie/${hit.id}/videos`, { include_video_language: "es,en" })).results || []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
    vids.sort((a, b) => (b.official - a.official) || ((b.iso_639_1 === "es") - (a.iso_639_1 === "es")));
    if (vids[0]) out.trailer = `https://www.youtube.com/watch?v=${vids[0].key}`;
    return out;
  } catch (e) { console.log(`  --   TMDB no respondió para ${p.titulo} (${e.message}); sigo sin imágenes`); return {}; }
}
// Foto, nacimiento y biografía de una persona desde TMDB (todo opcional)
async function datosTmdbPersona(nombre) {
  try {
    const hit = ((await tmdb("/search/person", { query: nombre, include_adult: "false" })).results || [])[0];
    if (!hit) return {};
    const det = await tmdb(`/person/${hit.id}`).catch(() => ({}));
    return { foto: hit.profile_path ? `${IMG}/w185${hit.profile_path}` : "", nacimiento: det.birthday || "", bio: (det.biography || "").slice(0, 1500) };
  } catch { return {}; }
}

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de estrenos.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }
  if (!tmdbKey) console.log("(sin TMDB_KEY: se crean películas y reparto sin imágenes ni fotos)\n");

  // Géneros: se reutilizan los que ya existen y se crean los que falten
  const generos = new Map(lista((await call("GET", "/genres")).d).map((g) => [sinTildes(g.name), g.id]));
  const idGenero = async (nombre) => {
    const k = sinTildes(nombre);
    if (generos.has(k)) return generos.get(k);
    const r = await call("POST", "/genres/create/", { name: nombre });
    if (r.ok) { generos.set(k, r.d.id); log(true, `género nuevo: ${nombre}`); return r.d.id; }
    log(false, `género ${nombre} → ${r.d?.message || r.status}`); return null;
  };

  const personas = new Map(lista((await call("GET", "/persons")).d).map((p) => [sinTildes(p.fullName), p.id]));
  const existentes = lista((await call("GET", "/movies")).d);
  let pelisNuevas = 0, personasNuevas = 0, vinculos = 0;

  for (const p of PELICULAS) {
    console.log(p.titulo);
    const tm = tmdbKey ? await datosTmdbPelicula(p) : {};
    const afiche = p.afiche || tm.afiche || "", fondo = p.fondo || tm.fondo || "", trailer = p.trailer || tm.trailer || "";

    let peli = existentes.find((m) => sinTildes(m.title) === sinTildes(p.titulo));
    if (peli) {
      console.log("  --   ya existe, solo se completa lo que falte");
      const falta = {};
      if (!peli.posterUrl && afiche) falta.posterUrl = afiche;
      if (!peli.backdropUrl && fondo) falta.backdropUrl = fondo;
      if (!peli.trailerUrl && trailer) falta.trailerUrl = trailer;
      if (Object.keys(falta).length) { const r = await call("PUT", `/movies/update/${peli.id}`, falta); log(r.ok, `completar ${Object.keys(falta).join(", ")}`); }
    } else {
      const genreIds = (await Promise.all(p.generos.map(idGenero))).filter(Boolean);
      const r = await call("POST", "/movies/create/", {
        title: p.titulo, synopsis: p.sinopsis, durationMinutes: p.duracion, releaseDate: p.estreno, rating: p.clasificacion,
        originalLanguage: p.idioma, posterUrl: afiche || undefined, backdropUrl: fondo || undefined, trailerUrl: trailer || undefined,
        status: true, genreIds
      });
      if (!r.ok) { log(false, `crear película → ${r.d?.message || r.status}`); continue; }
      peli = { id: r.d.id }; pelisNuevas++;
      log(true, `película creada (estreno ${p.estreno})${afiche ? "" : " — sin afiche"}${trailer ? "" : " — sin tráiler"}`);
    }

    const detalle = simular || !peli.id ? {} : ((await call("GET", `/movies/${peli.id}`)).d || {});
    const yaEsta = new Set((detalle.people ?? detalle.persons ?? []).map((x) => sinTildes(x.fullName)));
    for (const g of p.reparto) {
      const k = sinTildes(g.nombre);
      if (yaEsta.has(k)) continue;
      let pid = personas.get(k);
      if (!pid) {
        const t = tmdbKey ? await datosTmdbPersona(g.nombre) : {};
        const r = await call("POST", "/persons/create/", { fullName: g.nombre, photoUrl: g.foto || t.foto || "", birthDate: g.nacimiento || t.nacimiento || undefined, biography: g.bio || t.bio || "" });
        if (!r.ok) { log(false, `crear persona ${g.nombre} → ${r.d?.message || r.status}`); continue; }
        pid = r.d.id; personas.set(k, pid); personasNuevas++;
      }
      const r = await call("POST", `/movies/${peli.id}/cast`, { personId: pid, role: g.rol });
      if (r.ok) vinculos++;
      log(r.ok, `${g.nombre} — ${g.rol}${r.ok ? "" : " → " + (r.d?.message || r.status)}`);
    }
    console.log("");
  }
  console.log(`Listo. Películas nuevas: ${pelisNuevas}. Personas nuevas: ${personasNuevas}. Asignaciones al reparto: ${vinculos}. (No se creó ninguna función.)`);
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
