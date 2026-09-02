// ============================================================================
// CONTROLADOR DE CATEGORIAS
// ============================================================================
// Lectura publica (cualquiera puede ver las categorias activas en la
// tienda). Creacion/edicion/borrado reservado a EMPLEADO y JEFE (se filtra
// con el middleware requireRole en categories.routes.js).
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { logActivity } = require("../services/activityLog.service");

/** GET /api/categorias - lista publica de categorias activas, ordenadas. */
async function listPublic(req, res) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ ok: true, categories });
}

/** GET /api/admin/categorias - lista completa (incluye inactivas) para el panel. */
async function listAll(req, res) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ ok: true, categories });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** POST /api/admin/categorias - crea una categoria nueva. */
async function create(req, res) {
  const { name, sortOrder } = req.body;
  if (!name) throw new AppError("El nombre de la categoria es obligatorio.");

  const category = await prisma.category.create({
    data: { name, slug: slugify(name), sortOrder: Number(sortOrder) || 0 },
  });

  await logActivity({ userId: req.user.id, action: "CATEGORY_CREATE", entity: "Category", entityId: category.id, newValue: category });
  res.status(201).json({ ok: true, category });
}

/** PUT /api/admin/categorias/:id - edita nombre, orden, estado o imagen. */
async function update(req, res) {
  const id = Number(req.params.id);
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) throw new AppError("Categoria no encontrada.", 404);

  const { name, sortOrder, isActive } = req.body;
  const data = {};
  if (name !== undefined) { data.name = name; data.slug = slugify(name); }
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  const category = await prisma.category.update({ where: { id }, data });
  await logActivity({ userId: req.user.id, action: "CATEGORY_UPDATE", entity: "Category", entityId: id, oldValue: before, newValue: category });
  res.json({ ok: true, category });
}

/**
 * DELETE /api/admin/categorias/:id
 * No se borra fisicamente si tiene productos asociados (romperia el
 * historial de ventas/pedidos); en su lugar se desactiva.
 */
async function remove(req, res) {
  const id = Number(req.params.id);
  const productCount = await prisma.product.count({ where: { categoryId: id } });

  if (productCount > 0) {
    const category = await prisma.category.update({ where: { id }, data: { isActive: false } });
    await logActivity({ userId: req.user.id, action: "CATEGORY_DEACTIVATE", entity: "Category", entityId: id });
    return res.json({ ok: true, category, message: "La categoria tiene productos asociados: se desactivo en vez de eliminarla." });
  }

  await prisma.category.delete({ where: { id } });
  await logActivity({ userId: req.user.id, action: "CATEGORY_DELETE", entity: "Category", entityId: id });
  res.json({ ok: true });
}

/** Sube/reemplaza la imagen de una categoria. Se monta con el middleware de upload en la ruta. */
async function uploadImage(req, res) {
  const id = Number(req.params.id);
  if (!req.file) throw new AppError("No se recibio ninguna imagen.");
  const { buildPublicUrl } = require("../middleware/upload.middleware");
  const imageUrl = buildPublicUrl("categorias", req.file.filename);

  const category = await prisma.category.update({ where: { id }, data: { imageUrl } });
  res.json({ ok: true, category });
}

module.exports = { listPublic, listAll, create, update, remove, uploadImage };
