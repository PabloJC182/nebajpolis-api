// Documentacion OpenAPI de la API. Disponible en /api/docs (interfaz) y /api/docs.json
const swaggerUi = require("swagger-ui-express");

const ok = { description: "OK" };
const body = (props, required = []) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", required, properties: props } } }
});
const s = (type = "string", extra = {}) => ({ type, ...extra });
const id = { name: "id", in: "path", required: true, schema: { type: "integer" } };
const seguro = [{ bearerAuth: [] }];

const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, responses: { 200: ok }, ...extra });
const admin = (o) => ({ ...o, security: seguro, description: "Requiere rol administrador." });
const user = (o) => ({ ...o, security: seguro });

const crud = (tag, ruta, plural, props, required = []) => ({
  [`/${ruta}`]: { get: op(tag, `Listar ${plural}`) },
  [`/${ruta}/{id}`]: { get: op(tag, `Obtener ${plural} por id`, { parameters: [id] }) },
  [`/${ruta}/create/`]: { post: admin(op(tag, `Crear (${plural})`, { requestBody: body(props, required) })) },
  [`/${ruta}/update/{id}`]: { put: admin(op(tag, `Actualizar (${plural})`, { parameters: [id], requestBody: body(props) })) },
  [`/${ruta}/delete/{id}`]: { delete: admin(op(tag, `Eliminar (${plural})`, { parameters: [id] })) }
});

const paths = {
  "/auth/signup": { post: op("Auth", "Registrar usuario (rol customer)", { requestBody: body({ fullName: s(), email: s(), password: s("string", { minLength: 8 }), phone: s() }, ["email", "password"]) }) },
  "/auth/signin": { post: op("Auth", "Iniciar sesion. Devuelve accessToken (JWT)", { requestBody: body({ email: s(), password: s() }, ["email", "password"]) }) },
  "/auth/me": {
    get: user(op("Auth", "Perfil del usuario autenticado")),
    put: user(op("Auth", "Actualizar nombre y telefono", { requestBody: body({ fullName: s(), phone: s() }) }))
  },
  "/auth/change-password": { post: user(op("Auth", "Cambiar contraseña", { requestBody: body({ currentPassword: s(), newPassword: s() }, ["currentPassword", "newPassword"]) })) },
  "/auth/forgot": { post: op("Auth", "Solicitar enlace de recuperacion por correo", { requestBody: body({ email: s() }, ["email"]) }) },
  "/auth/reset": { post: op("Auth", "Restablecer contraseña con el token del correo", { requestBody: body({ token: s(), password: s() }, ["token", "password"]) }) },

  "/movies/activas": { get: op("Peliculas", "Peliculas activas (cartelera)") },
  ...crud("Peliculas", "movies", "peliculas", { title: s(), synopsis: s(), durationMinutes: s("integer"), releaseDate: s("string", { format: "date" }), rating: s(), originalLanguage: s(), posterUrl: s(), backdropUrl: s(), trailerUrl: s(), status: s("boolean"), genreIds: { type: "array", items: s("integer") } }, ["title", "durationMinutes"]),
  "/movies/{id}/cast": { post: admin(op("Peliculas", "Agregar persona al reparto", { parameters: [id], requestBody: body({ personId: s("integer"), role: s() }, ["personId", "role"]) })) },
  "/movies/{id}/cast/{personId}": { delete: admin(op("Peliculas", "Quitar persona del reparto", { parameters: [id, { name: "personId", in: "path", required: true, schema: { type: "integer" } }] })) },
  ...crud("Personas", "persons", "personas", { fullName: s(), photoUrl: s(), birthDate: s("string", { format: "date" }), biography: s() }, ["fullName"]),
  ...crud("Generos", "genres", "generos", { name: s() }, ["name"]),
  ...crud("Cines", "cinemas", "cines", { name: s(), address: s(), city: s(), phone: s() }, ["name"]),
  ...crud("Salas", "rooms", "salas", { name: s(), capacity: s("integer"), roomType: s(), cinemaId: s("integer") }, ["name", "cinemaId"]),
  "/rooms/{id}/generar-asientos": { post: admin(op("Salas", "Generar la cuadricula de asientos (filas A.., N por fila)", { requestBody: body({ rows: s("integer"), seatsPerRow: s("integer"), replace: { type: "boolean" } }, ["rows", "seatsPerRow"]) })) },

  "/seats": { get: op("Asientos", "Listar asientos (filtro ?roomId=)") },
  "/seats/create/": { post: admin(op("Asientos", "Crear asiento", { requestBody: body({ rowLabel: s(), seatNumber: s("integer"), seatType: s(), roomId: s("integer") }, ["rowLabel", "seatNumber", "roomId"]) })) },
  "/seats/bulk": { post: admin(op("Asientos", "Crear asientos en lote", { requestBody: body({ roomId: s("integer"), seats: { type: "array", items: { type: "object", properties: { rowLabel: s(), seatNumber: s("integer"), seatType: s() } } } }, ["roomId", "seats"]) })) },

  "/shows": { get: op("Funciones", "Listar funciones (filtros ?movieId, ?roomId, ?cinemaId, ?upcoming=1, ?from&to)") },
  "/shows/{id}": { get: op("Funciones", "Obtener funcion", { parameters: [id] }) },
  "/shows/{id}/seats": { get: op("Funciones", "Mapa de asientos con disponibilidad", { parameters: [id] }) },
  "/shows/create/": { post: admin(op("Funciones", "Crear funcion", { requestBody: body({ movieId: s("integer"), roomId: s("integer"), showDatetime: s("string", { format: "date-time" }), basePrice: s("number"), format: s(), status: s("boolean") }, ["movieId", "roomId", "showDatetime", "basePrice"]) })) },
  "/shows/update/{id}": { put: admin(op("Funciones", "Actualizar funcion", { parameters: [id] })) },
  "/shows/delete/{id}": { delete: admin(op("Funciones", "Eliminar funcion", { parameters: [id] })) },

  "/banners": { get: op("Banners", "Banners activos y vigentes del inicio") },
  "/banners/todos": { get: admin(op("Banners", "Todos los banners (admin)")) },
  "/banners/create/": { post: admin(op("Banners", "Crear banner", { requestBody: body({ title: s(), subtitle: s(), imageUrl: s(), linkUrl: s(), buttonText: s(), sortOrder: s("integer"), validFrom: s("string", { format: "date-time" }), validTo: s("string", { format: "date-time" }), status: s("boolean") }, ["title", "imageUrl"]) })) },
  "/banners/update/{id}": { put: admin(op("Banners", "Actualizar banner", { parameters: [id], requestBody: body({ title: s(), subtitle: s(), imageUrl: s(), linkUrl: s(), buttonText: s(), sortOrder: s("integer"), validFrom: s("string", { format: "date-time" }), validTo: s("string", { format: "date-time" }), status: s("boolean") }) })) },
  "/banners/delete/{id}": { delete: admin(op("Banners", "Eliminar banner", { parameters: [id] })) },
  "/contact": { post: op("Contacto", "Enviar mensaje del formulario de contacto (5 por hora por IP)", { requestBody: body({ name: s(), email: s(), subject: s(), message: s() }, ["name", "email", "message"]) }) },
  "/promotions/vigentes": { get: op("Promociones", "Promociones vigentes") },
  ...crud("Promociones", "promotions", "promociones", { name: s(), description: s(), discountPercentage: s("number"), validFrom: s("string", { format: "date-time" }), validTo: s("string", { format: "date-time" }), validDays: s("string"), status: s("boolean") }, ["name", "discountPercentage"]),

  "/food": { get: op("Comida", "Productos disponibles") },
  "/food/todos": { get: admin(op("Comida", "Todos los productos (incluye ocultos)")) },
  "/food/{id}": { get: op("Comida", "Obtener producto", { parameters: [id] }) },
  "/food/create/": { post: admin(op("Comida", "Crear producto", { requestBody: body({ name: s(), description: s(), category: s(), price: s("number"), imageUrl: s(), status: s("boolean") }, ["name", "price"]) })) },
  "/food/update/{id}": { put: admin(op("Comida", "Actualizar producto", { parameters: [id] })) },
  "/food/delete/{id}": { delete: admin(op("Comida", "Eliminar producto", { parameters: [id] })) },

  "/sales/create/": { post: user(op("Ventas", "Crear venta y reservar asientos (10 min). Responde 409 si algun asiento esta ocupado", { requestBody: body({ showId: s("integer"), seatIds: { type: "array", items: s("integer") }, promotionId: s("integer"), foodItems: { type: "array", items: { type: "object", properties: { foodItemId: s("integer"), quantity: s("integer") } } } }, ["showId", "seatIds"]) })) },
  "/sales/create-food": { post: op("Ventas", "Pedido de dulceria sin boletos (se recoge en el cine con QR). Sin sesion exige guestEmail", { requestBody: body({ cinemaId: s("integer"), foodItems: { type: "array", items: { type: "object", properties: { foodItemId: s("integer"), quantity: s("integer") } } }, guestEmail: s(), guestName: s() }, ["cinemaId", "foodItems"]) }) },
  "/sales/{id}/reembolsar": { post: admin(op("Ventas", "Reembolsar una venta pagada via Stripe (no si ya hay entradas usadas o pedido entregado)", { parameters: [id], requestBody: body({ reason: s() }) })) },
  "/sales/mias": { get: user(op("Ventas", "Mis ventas (con codigo QR en cada boleto pagado)")) },
  "/sales": { get: admin(op("Ventas", "Todas las ventas")) },
  "/sales/{id}": { get: user(op("Ventas", "Detalle de una venta", { parameters: [id] })) },
  "/sales/{id}/reenviar": { post: user(op("Ventas", "Reenviar las entradas por correo", { parameters: [id] })) },
  "/sales/{id}/cancelar": { post: user(op("Ventas", "Cancelar venta pendiente y liberar asientos", { parameters: [id] })) },

  "/pago/crear-payment-intent": { post: user(op("Pagos", "Crear Payment Intent de Stripe. Devuelve clientSecret", { requestBody: body({ saleId: s("integer") }, ["saleId"]) })) },
  "/pago/confirmar": { post: user(op("Pagos", "Confirmar con Stripe que el pago se completo y marcar la venta como pagada", { requestBody: body({ saleId: s("integer") }, ["saleId"]) })) },
  "/pago/webhook": { post: op("Pagos", "Webhook de Stripe (payment_intent.succeeded / payment_failed). Firma en stripe-signature") },

  "/reviews": { get: op("Resenas", "Listar resenas (?movieId=)") },
  "/reviews/create/": { post: user(op("Resenas", "Crear resena (una por usuario y pelicula)", { requestBody: body({ movieId: s("integer"), rating: s("integer", { minimum: 1, maximum: 5 }), comment: s() }, ["movieId", "rating"]) })) },
  "/reviews/update/{id}": { put: user(op("Resenas", "Editar mi resena", { parameters: [id] })) },
  "/reviews/delete/{id}": { delete: user(op("Resenas", "Eliminar mi resena (o cualquiera si eres admin)", { parameters: [id] })) },

  "/tickets/validar": { post: admin(op("Entradas", "Validar el QR de una entrada en la sala y marcarla como usada", { requestBody: body({ code: s(), marcar: s("boolean") }, ["code"]) })) },
  "/stats/resumen": { get: admin(op("Estadisticas", "Resumen para el panel admin (?dias=14)")) }
};

const spec = {
  openapi: "3.0.3",
  info: { title: "Nebajpolis - Cine API", version: "1.0.0", description: "API REST del portal de cartelera y venta de boletos. Autenticacion con JWT: usa el boton Authorize con el accessToken de /auth/signin." },
  servers: [{ url: "/api" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  paths
};

module.exports = (app) => {
  app.get("/api/docs.json", (req, res) => res.json(spec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "Nebajpolis API" }));
};
