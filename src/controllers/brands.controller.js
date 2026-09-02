// ============================================================================
// CONTROLADOR DE MARCAS
// ============================================================================
// Catalogo simple de marcas (ej: "Backus", "Cartavio", "Absolut") usado
// para filtrar productos en la tienda y para clasificar el catalogo.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

async function listPublic(req, res) {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  res.json({ ok: true, brands });
}

async function create(req, res) {
  const { name } = req.body;
  if (!name) throw new AppError("El nombre de la marca es obligatorio.");
  const brand = await prisma.brand.create({ data: { name } });
  res.status(201).json({ ok: true, brand });
}

async function remove(req, res) {
  await prisma.brand.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}

module.exports = { listPublic, create, remove };
