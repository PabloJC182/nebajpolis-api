// sequelize.sync() solo crea tablas nuevas: no agrega columnas a tablas que ya existen.
// Estas sentencias (idempotentes) agregan las columnas nuevas sin borrar datos.
const SENTENCIAS = [
  `ALTER TABLE IF EXISTS "tickets" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "guestEmail" VARCHAR(255)`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "guestName" VARCHAR(255)`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "guestToken" VARCHAR(255)`,
  `ALTER TABLE IF EXISTS "sales" ALTER COLUMN "userId" DROP NOT NULL`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(255) DEFAULT 'online'`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "soldBy" INTEGER`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "refundAmount" DECIMAL(10,2)`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "refundNote" TEXT`,
  `ALTER TABLE IF EXISTS "promotions" ADD COLUMN IF NOT EXISTS "validDays" VARCHAR(20)`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "kind" VARCHAR(255) DEFAULT 'tickets'`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "pickupCinemaId" INTEGER`,
  `ALTER TABLE IF EXISTS "sales" ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS "movies" ADD COLUMN IF NOT EXISTS "trailerUrl" VARCHAR(255)`,
  `ALTER TABLE IF EXISTS "saleFoodItems" ADD COLUMN IF NOT EXISTS "foodItemId" INTEGER REFERENCES "foodItems"(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE IF EXISTS "saleFoodItems" ADD COLUMN IF NOT EXISTS "saleId" INTEGER REFERENCES "sales"(id) ON UPDATE CASCADE ON DELETE CASCADE`,
];

module.exports = async (sequelize) => {
  for (const sql of SENTENCIAS) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.error("[db] No se pudo aplicar:", sql.slice(0, 70), "->", err.message);
    }
  }
  console.log("[db] Esquema verificado");
};
