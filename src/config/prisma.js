// ============================================================================
// CLIENTE DE PRISMA (conexion a la base de datos)
// ============================================================================
// Prisma recomienda tener UNA sola instancia de PrismaClient reutilizada en
// toda la app, en vez de crear una nueva en cada archivo. Este modulo la crea
// una unica vez y la exporta para que todos los controllers/services la usen.
// ============================================================================

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
