// Uso:  1) pega tu token abajo   2) en la terminal de VS Code:  node imagenes.js
// Cambia (PUT) el afiche y el fondo de películas que YA existen, buscándolas por título. Sobrescribe lo que tengan.
// Para cambiar una imagen, edita el enlace de IMAGENES y vuelve a correrlo. Lo que dejes vacío ("") no se toca.
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";
const SIMULAR = false; // true = solo muestra qué cambiaría

// afiche = vertical 2:3 (posterUrl) · fondo = horizontal 16:9 (backdropUrl)
const IMAGENES = {
  "Avengers: Doomsday": {
    afiche: "https://preview.redd.it/fanmade-poster-of-avengers-doomsday-hope-yall-like-it-v0-v5iuhwce8ahd1.jpeg?width=1080&crop=smart&auto=webp&s=68d6705e22569facdccdc24ad6ee2ded5a612de1",
    fondo: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/2e317a1c-f1ce-4a5f-90db-d88cc01db2d0/dly9dsp-fc2b9d39-4c06-4310-8f66-a07ff7b878a7.png/v1/fill/w_1280,h_487,q_80,strp/avengers_doomsday_banner_4k_2026_by_mrandrew7w7_dly9dsp-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NDg3IiwicGF0aCI6Ii9mLzJlMzE3YTFjLWYxY2UtNGE1Zi05MGRiLWQ4OGNjMDFkYjJkMC9kbHk5ZHNwLWZjMmI5ZDM5LTRjMDYtNDMxMC04ZjY2LWEwN2ZmN2I4NzhhNy5wbmciLCJ3aWR0aCI6Ijw9MTI4MCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.lRyBeHyAIDmApkzkDKibvGfmdQ2BORd1YuEOyoXC2ps"
  },
  "Dune: Part Three": {
    afiche: "",
    fondo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdc50twyHu8kKB3pejGc3o4wjCwa0aCL9F5STmALs_XQ&s=10"
  },
  "The Hunger Games: Sunrise on the Reaping": {
    afiche: "",
    fondo: "https://thefutureoftheforce.com/wp-content/uploads/2025/11/The-Hunger-Games-Sunshine-on-the-Reaping-Header-Official-FUTURE-OF-THE-FORCE.jpg"
  }
  // "Otra película": { afiche: "https://...", fondo: "https://..." },
};

const API = (process.env.API_URL || API_URL).replace(/\/$/, "");
const token = process.env.TOKEN || TOKEN;
const simular = SIMULAR || process.env.SIMULAR === "1";
const call = async (method, url, body) => {
  if (simular && method !== "GET") return { ok: true, status: 200, d: {} };
  const r = await fetch(API + url, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const lista = (d) => (Array.isArray(d) ? d : d?.rows || []);

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de imagenes.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }
  const peliculas = lista((await call("GET", "/movies")).d);
  for (const [titulo, img] of Object.entries(IMAGENES)) {
    const m = peliculas.find((x) => sinTildes(x.title) === sinTildes(titulo));
    if (!m) { console.log(`  --   ${titulo}: no existe en tu base (¿se creó con estrenos.js?)`); continue; }
    const cambios = {};
    if (img.afiche) cambios.posterUrl = img.afiche;
    if (img.fondo) cambios.backdropUrl = img.fondo;
    if (!Object.keys(cambios).length) { console.log(`  --   ${titulo}: sin enlaces que cambiar`); continue; }
    const r = await call("PUT", `/movies/update/${m.id}`, cambios);
    console.log(`  ${r.ok ? "ok   " : "FALLÓ"} ${titulo}: ${Object.keys(cambios).map((k) => k === "posterUrl" ? "afiche" : "fondo").join(" + ")}${r.ok ? "" : " → " + (r.d?.message || r.status)}`);
    if (!r.ok && /too long|largo|255/i.test(String(r.d?.message))) console.log("       El enlace no cabe: falta desplegar el back con el cambio de columnas (ensureSchema.js).");
  }
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
