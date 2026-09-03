// ============================================================================
// CONTROLADOR DE PRODUCTOS
// ============================================================================
// Lectura publica con busqueda/filtros/orden (para el catalogo de la
// tienda). Escritura (crear/editar/eliminar/stock) reservada a EMPLEADO y
// JEFE segun permisos, filtrado en products.routes.js.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { getEffectiveUnitPrice } = require("../services/pricing.service");
const { logActivity } = require("../services/activityLog.service");
const { MOVEMENT_TYPES } = require("../constants");

/**
 * GET /api/productos
 * Lista publica del catalogo, con busqueda, filtros y orden. Todos los
 * parametros son opcionales (query string):
 *   q          - busca por nombre o marca
 *   categoria  - id de categoria
 *   marca      - id de marca
 *   soloPromo  - "1" para mostrar solo productos con promocion activa
 *   precioMax  - precio maximo (para los accesos rapidos "Compra por precio")
 *   precioMin  - precio minimo
 *   orden      - "recientes" | "masVendidos" | "precioAsc" | "precioDesc"
 *   pagina, porPagina - paginacion
 */
async function listPublic(req, res) {
  const { q, categoria, marca, soloPromo, orden, precioMax, precioMin } = req.query;
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const porPagina = Math.min(60, Number(req.query.porPagina) || 24);

  const where = { isActive: true };
  if (categoria) where.categoryId = Number(categoria);
  if (marca) where.brandId = Number(marca);
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { brand: { name: { contains: q } } },
    ];
  }
  // El filtro de precio se aplica sobre el precio de lista (price). No se
  // filtra por el precio con descuento porque ese solo se conoce en
  // JavaScript (getEffectiveUnitPrice) y complicaria la consulta SQL; es
  // una aproximacion razonable para los accesos rapidos "Compra por precio".
  if (precioMax) where.price = { ...(where.price || {}), lte: Number(precioMax) };
  if (precioMin) where.price = { ...(where.price || {}), gte: Number(precioMin) };
  if (soloPromo === "1") {
    where.OR = [...(where.OR || []), { promoPrice: { not: null } }, { discountPercent: { not: null } }];
  }

  let orderBy = { createdAt: "desc" }; // "recientes" por defecto
  if (orden === "precioAsc") orderBy = { price: "asc" };
  if (orden === "precioDesc") orderBy = { price: "desc" };
  if (orden === "masVendidos") {
    // Se aproxima "mas vendidos" ordenando por cantidad total vendida
    // (ver mejora futura: columna calculada/cacheada si el catalogo crece mucho).
    orderBy = undefined; // se resuelve distinto abajo
  }

  let products;
  let total;

  if (orden === "masVendidos") {
    // Trae los productos y sus items de venta, y ordena en memoria por
    // unidades vendidas. Aceptable para un catalogo de tamano de licoreria;
    // si creciera mucho, se cambiaria por una columna "totalSold" cacheada.
    const all = await prisma.product.findMany({
      where,
      include: { category: true, brand: true, saleItems: true },
    });
    all.sort((a, b) => sumQty(b.saleItems) - sumQty(a.saleItems));
    total = all.length;
    products = all.slice((pagina - 1) * porPagina, pagina * porPagina).map(stripSaleItems);
  } else {
    [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true },
        orderBy,
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.product.count({ where }),
    ]);
  }

  const withPricing = products.map((p) => ({ ...p, effectivePrice: getEffectiveUnitPrice(p) }));
  res.json({ ok: true, products: withPricing, total, pagina, porPagina });
}

function sumQty(saleItems) {
  return saleItems.reduce((sum, si) => sum + si.quantity, 0);
}
function stripSaleItems({ saleItems, ...rest }) {
  return rest;
}

/** GET /api/productos/:id - detalle publico de un producto. */
async function getById(req, res) {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true, images: true },
  });
  if (!product || !product.isActive) throw new AppError("Producto no encontrado.", 404);
  res.json({ ok: true, product: { ...product, effectivePrice: getEffectiveUnitPrice(product) } });
}

/** GET /api/admin/productos - lista completa para el panel (incluye inactivos, sin paginar). */
async function listAdmin(req, res) {
  const products = await prisma.product.findMany({
    include: { category: true, brand: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ ok: true, products });
}

/** POST /api/admin/productos - crea un producto nuevo. */
async function create(req, res) {
  const body = req.body;
  requireProductFields(body);

  const product = await prisma.product.create({
    data: {
      sku: body.sku,
      name: body.name,
      description: body.description || null,
      presentation: body.presentation || null,
      price: Number(body.price),
      promoPrice: body.promoPrice != null && body.promoPrice !== "" ? Number(body.promoPrice) : null,
      discountPercent: body.discountPercent != null && body.discountPercent !== "" ? Number(body.discountPercent) : null,
      unitsPerBox: body.unitsPerBox != null && body.unitsPerBox !== "" ? Number(body.unitsPerBox) : null,
      boxPrice: body.boxPrice != null && body.boxPrice !== "" ? Number(body.boxPrice) : null,
      stock: Number(body.stock) || 0,
      minStock: Number(body.minStock) || 5,
      categoryId: Number(body.categoryId),
      brandId: body.brandId ? Number(body.brandId) : null,
    },
  });

  // Si arranca con stock inicial, se deja registrado como movimiento de ENTRADA.
  if (product.stock > 0) {
    await prisma.inventoryMovement.create({
      data: { productId: product.id, type: MOVEMENT_TYPES.ENTRADA, quantity: product.stock, reason: "Stock inicial", userId: req.user.id },
    });
  }

  await logActivity({ userId: req.user.id, action: "PRODUCT_CREATE", entity: "Product", entityId: product.id, newValue: product });
  res.status(201).json({ ok: true, product });
}

function requireProductFields(body) {
  if (!body.sku || !body.name || body.price == null || !body.categoryId) {
    throw new AppError("SKU, nombre, precio y categoria son obligatorios.");
  }
  if (Number(body.price) <= 0) throw new AppError("El precio debe ser mayor a 0.");
}

/**
 * PUT /api/admin/productos/:id
 * Edita datos del producto. El STOCK no se toca aca (usar el endpoint de
 * inventario /api/admin/inventario/movimiento) para que todo cambio de
 * stock quede siempre acompanado de su registro de auditoria.
 */
async function update(req, res) {
  const id = Number(req.params.id);
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new AppError("Producto no encontrado.", 404);

  const body = req.body;
  const data = {};
  for (const field of ["sku", "name", "description", "presentation"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.price !== undefined) data.price = Number(body.price);
  if (body.promoPrice !== undefined) data.promoPrice = body.promoPrice === "" ? null : Number(body.promoPrice);
  if (body.discountPercent !== undefined) data.discountPercent = body.discountPercent === "" ? null : Number(body.discountPercent);
  if (body.unitsPerBox !== undefined) data.unitsPerBox = body.unitsPerBox === "" ? null : Number(body.unitsPerBox);
  if (body.boxPrice !== undefined) data.boxPrice = body.boxPrice === "" ? null : Number(body.boxPrice);
  if (body.minStock !== undefined) data.minStock = Number(body.minStock);
  if (body.categoryId !== undefined) data.categoryId = Number(body.categoryId);
  if (body.brandId !== undefined) data.brandId = body.brandId ? Number(body.brandId) : null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const product = await prisma.product.update({ where: { id }, data });
  await logActivity({ userId: req.user.id, action: "PRODUCT_UPDATE", entity: "Product", entityId: id, oldValue: before, newValue: product });
  res.json({ ok: true, product });
}

/** DELETE /api/admin/productos/:id - desactiva el producto (no se borra: preserva historial de ventas). */
async function remove(req, res) {
  const id = Number(req.params.id);
  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  await logActivity({ userId: req.user.id, action: "PRODUCT_DEACTIVATE", entity: "Product", entityId: id });
  res.json({ ok: true, product });
}

/** Sube/reemplaza la imagen principal de un producto. */
async function uploadImage(req, res) {
  const id = Number(req.params.id);
  if (!req.file) throw new AppError("No se recibio ninguna imagen.");
  const { buildPublicUrl } = require("../middleware/upload.middleware");
  const imageUrl = buildPublicUrl("productos", req.file.filename);

  const product = await prisma.product.update({ where: { id }, data: { imageUrl } });
  res.json({ ok: true, product });
}

module.exports = { listPublic, getById, listAdmin, create, update, remove, uploadImage };
