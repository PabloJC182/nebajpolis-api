// Uso:  1) pega tu token abajo   2) en la terminal de VS Code:  node post.js
// (todo está en este archivo, no necesita nada más). Es seguro correrlo varias veces:
// lo que ya existe se omite (excepto la llave del proveedor, que se crea de nuevo).
const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_ADMIN";
const API_URL = "https://nebajpolis-api.onrender.com/api";
// Qué cargar: "comida", "cupones", "combos", "banners", "reportes", "llaves" (quita las que no quieras)
const CARGAR = ["comida", "cupones", "combos", "banners", "reportes", "llaves"];


// ====== DATOS: edítalos aquí (precios, nombres, fechas, correos) ======
// Las imageUrl son imágenes de relleno (placehold.co). Reemplázalas por la URL de tu foto real. Banners: 1920×640 px y SIN texto dentro de la imagen (el título y el botón los pone la página). Comida y combos: cuadradas, 800×800 px
// (cualquier enlace https que abra la imagen directamente: tu hosting, Cloudinary, Supabase Storage, etc.).
const datos = {
  comida: [
    {"name": "Palomitas Pequeñas", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Palomitas+Peque%C3%B1as", "category": "Snacks", "price": 20, "description": "Palomitas con mantequilla, tamaño personal", "stock": 120, "stockMin": 20},
    {"name": "Palomitas Medianas", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Palomitas+Medianas", "category": "Snacks", "price": 30, "description": "Palomitas con mantequilla, tamaño mediano", "stock": 120, "stockMin": 20},
    {"name": "Palomitas Grandes", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Palomitas+Grandes", "category": "Snacks", "price": 42, "description": "Palomitas con mantequilla, tamaño familiar", "stock": 80, "stockMin": 15},
    {"name": "Nachos con Queso", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Nachos+con+Queso", "category": "Snacks", "price": 28, "description": "Nachos crujientes con salsa de queso", "stock": 60, "stockMin": 10},
    {"name": "Hot Dog", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Hot+Dog", "category": "Snacks", "price": 25, "description": "Salchicha con pan, mostaza y cátsup", "stock": 40, "stockMin": 8},
    {"name": "Refresco Mediano", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Refresco+Mediano", "category": "Bebidas", "price": 15, "description": "Refresco de 16 oz", "stock": 150, "stockMin": 25},
    {"name": "Refresco Grande", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Refresco+Grande", "category": "Bebidas", "price": 20, "description": "Refresco de 22 oz", "stock": 150, "stockMin": 25},
    {"name": "Agua Pura", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Agua+Pura", "category": "Bebidas", "price": 10, "description": "Botella de 500 ml", "stock": 100, "stockMin": 20},
    {"name": "Chocolate M&M", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Chocolate+M%26M", "category": "Dulces", "price": 12, "description": "Bolsa individual", "stock": 70, "stockMin": 12},
    {"name": "Gomitas", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Gomitas", "category": "Dulces", "price": 10, "description": "Bolsa de gomitas surtidas", "stock": 5, "stockMin": 10},
    {"name": "Café Americano", "imageUrl": "https://placehold.co/400x400/6d28d9/ffffff/png?text=Caf%C3%A9+Americano", "category": "Bebidas", "price": 14, "description": "Café recién hecho", "stock": null, "stockMin": 0}
  ],
  cupones: [
    {"code": "BIENVENIDO10", "type": "percent", "value": 10, "appliesTo": "all", "description": "10% en tu primera compra", "minAmount": 0, "maxUses": null, "perUserLimit": 1, "validFrom": null, "validTo": "2026-12-31T23:59:00-06:00", "status": true},
    {"code": "CINE20", "type": "percent", "value": 20, "appliesTo": "tickets", "description": "20% en boletos, compras desde Q80", "minAmount": 80, "maxUses": 200, "perUserLimit": 2, "validFrom": null, "validTo": "2026-11-30T23:59:00-06:00", "status": true},
    {"code": "COMBO5", "type": "fixed", "value": 5, "appliesTo": "food", "description": "Q5 de descuento en dulcería, compras desde Q30", "minAmount": 30, "maxUses": null, "perUserLimit": 3, "validFrom": null, "validTo": null, "status": true},
    {"code": "NAVIDAD25", "type": "fixed", "value": 25, "appliesTo": "all", "description": "Q25 de descuento en compras desde Q100", "minAmount": 100, "maxUses": 100, "perUserLimit": 1, "validFrom": "2026-12-01T00:00:00-06:00", "validTo": "2026-12-26T23:59:00-06:00", "status": true},
    {"code": "UNIVERSITARIO", "type": "percent", "value": 15, "appliesTo": "tickets", "description": "15% en boletos para estudiantes (mostrar carné)", "minAmount": 0, "maxUses": null, "perUserLimit": null, "validFrom": null, "validTo": null, "status": true}
  ],
  combos: [
    {"name": "Combo Individual", "imageUrl": "https://placehold.co/800x500/6d28d9/ffffff/png?text=Combo+Individual", "description": "1 boleto + palomitas medianas + refresco mediano", "ticketQty": 1, "price": 75, "validFrom": null, "validTo": null, "status": true, "items": [{"comida": "Palomitas Medianas", "quantity": 1}, {"comida": "Refresco Mediano", "quantity": 1}]},
    {"name": "Combo Pareja", "imageUrl": "https://placehold.co/800x500/6d28d9/ffffff/png?text=Combo+Pareja", "description": "2 boletos + palomitas grandes + 2 refrescos medianos", "ticketQty": 2, "price": 135, "validFrom": null, "validTo": null, "status": true, "items": [{"comida": "Palomitas Grandes", "quantity": 1}, {"comida": "Refresco Mediano", "quantity": 2}]},
    {"name": "Combo Amigos", "imageUrl": "https://placehold.co/800x500/6d28d9/ffffff/png?text=Combo+Amigos", "description": "4 boletos + 2 palomitas grandes + 4 refrescos + nachos", "ticketQty": 4, "price": 255, "validFrom": null, "validTo": null, "status": true, "items": [{"comida": "Palomitas Grandes", "quantity": 2}, {"comida": "Refresco Grande", "quantity": 4}, {"comida": "Nachos con Queso", "quantity": 1}]},
    {"name": "Combo Familiar", "imageUrl": "https://placehold.co/800x500/6d28d9/ffffff/png?text=Combo+Familiar", "description": "4 boletos + palomitas grandes + 4 hot dogs + 4 aguas", "ticketQty": 4, "price": 280, "validFrom": null, "validTo": null, "status": true, "items": [{"comida": "Palomitas Grandes", "quantity": 1}, {"comida": "Hot Dog", "quantity": 4}, {"comida": "Agua Pura", "quantity": 4}]}
  ],
  banners: [
    {"title": "Estrenos de la semana", "subtitle": "Reserva tus asientos y evita filas", "imageUrl": "https://placehold.co/1920x640/6d28d9/6d28d9/png", "linkUrl": "/cartelera", "buttonText": "Ver cartelera", "sortOrder": 1, "validFrom": null, "validTo": null, "status": true},
    {"title": "Combos para toda la familia", "subtitle": "Boletos + palomitas + refrescos a precio especial", "imageUrl": "https://placehold.co/1920x640/a21caf/a21caf/png", "linkUrl": "/dulceria", "buttonText": "Ver combos", "sortOrder": 2, "validFrom": null, "validTo": null, "status": true},
    {"title": "Martes de descuento", "subtitle": "Aprovecha nuestras promociones", "imageUrl": "https://placehold.co/1920x640/4c1d95/4c1d95/png", "linkUrl": "/promociones", "buttonText": "Ver promociones", "sortOrder": 3, "validFrom": null, "validTo": null, "status": true}
  ],
  reportesProgramados: [
    {"email": "dueno@ejemplo.com", "frequency": "weekly"},
    {"email": "gerencia@ejemplo.com", "frequency": "daily"}
  ],
  llavesProveedor: [
    {"name": "Proveedor de datos (solo lectura)", "expiresAt": "2027-10-27T00:00:00-06:00"}
  ]
};
// ====== FIN DE LOS DATOS ======

const API = (process.env.API_URL || API_URL).replace(/\/$/, "");
const solo = CARGAR;
let token = process.env.TOKEN || TOKEN;

const call = async (method, url, body) => {
  const r = await fetch(API + url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const log = (ok, txt) => console.log((ok ? "  ok   " : "  FALLÓ ") + txt);

(async () => {
  if (!token || token.startsWith("PEGA_AQUI")) { console.error("Pega tu token en la constante TOKEN al inicio de post.js."); process.exit(1); }
  const prueba = await call("GET", "/cupones");
  if (prueba.status === 401 || prueba.status === 403) { console.error("Token inválido, vencido o la cuenta no es admin (error " + prueba.status + "). Vuelve a iniciar sesión y copia un token nuevo."); process.exit(1); }

  const lista = async () => (await call("GET", "/food/todos")).d || [];
  let comida = await lista();
  const porNombre = (n) => comida.find((c) => c.name.toLowerCase() === n.toLowerCase());

  if (solo.includes("comida")) {
    console.log("Comida e inventario");
    for (const c of datos.comida) {
      let it = porNombre(c.name);
      if (!it) {
        const r = await call("POST", "/food/create/", { name: c.name, category: c.category, price: c.price, description: c.description, imageUrl: c.imageUrl, status: true });
        log(r.ok, `crear ${c.name}`); if (!r.ok) continue; it = r.d;
      } else log(true, `${c.name} ya existía`);
      if (c.stock !== null && c.stock !== undefined) {
        const cfg = await call("PUT", `/inventario/${it.id}/config`, { stockMin: c.stockMin });
        const aj = await call("POST", `/inventario/${it.id}/ajuste`, { tipo: "conteo", cantidad: c.stock, nota: "Carga inicial" });
        log(cfg.ok && aj.ok, `   stock ${c.stock} (mínimo ${c.stockMin})`);
      }
    }
    comida = await lista();
  }

  if (solo.includes("cupones")) {
    console.log("Cupones");
    const ya = ((await call("GET", "/cupones")).d || []).map((c) => c.code);
    for (const c of datos.cupones) {
      if (ya.includes(c.code)) { log(true, `${c.code} ya existía`); continue; }
      const r = await call("POST", "/cupones/create/", c); log(r.ok, `${c.code}${r.ok ? "" : " → " + r.d?.message}`);
    }
  }

  if (solo.includes("combos")) {
    console.log("Combos");
    const ya = ((await call("GET", "/combos/todos")).d || []).map((c) => c.name);
    for (const c of datos.combos) {
      if (ya.includes(c.name)) { log(true, `${c.name} ya existía`); continue; }
      const items = [];
      for (const i of c.items) { const f = porNombre(i.comida); if (!f) { log(false, `${c.name}: no existe «${i.comida}»`); break; } items.push({ foodItemId: f.id, quantity: i.quantity }); }
      if (items.length !== c.items.length) continue;
      const { items: _omit, ...resto } = c;
      const r = await call("POST", "/combos/create/", { ...resto, items }); log(r.ok, `${c.name}${r.ok ? "" : " → " + r.d?.message}`);
    }
  }

  if (solo.includes("banners")) {
    console.log("Banners del inicio");
    const ya = ((await call("GET", "/banners/todos")).d || []).map((b) => b.title);
    for (const b of datos.banners) {
      if (ya.includes(b.title)) { log(true, `${b.title} ya existía`); continue; }
      const r = await call("POST", "/banners/create/", b); log(r.ok, `${b.title}${r.ok ? "" : " → " + r.d?.message}`);
    }
  }

  if (solo.includes("reportes")) {
    console.log("Reportes programados (cambia los correos de ejemplo antes de correr esto)");
    for (const s of datos.reportesProgramados) { const r = await call("POST", "/reporte-programado", s); log(r.ok || r.status === 409, `${s.email} (${s.frequency})${r.ok ? "" : " → " + r.d?.message}`); }
  }

  if (solo.includes("llaves")) {
    console.log("Llaves del proveedor (se muestran UNA sola vez; cópialas ahora)");
    for (const k of datos.llavesProveedor) { const r = await call("POST", "/llaves", k); log(r.ok, k.name); if (r.ok) console.log("     LLAVE:", r.d.key || r.d.apiKey || JSON.stringify(r.d)); }
  }
  console.log("Listo.");
})();
