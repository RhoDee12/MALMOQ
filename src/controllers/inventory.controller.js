// ============================================================================
// CONTROLADOR DE INVENTARIO
// ============================================================================
// Todo cambio de stock que NO sea por una venta (ingreso de mercaderia,
// correccion manual, merma, devolucion) pasa por aca, y siempre deja un
// InventoryMovement registrado - asi el historial de stock es auditable.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { MOVEMENT_TYPES } = require("../constants");
const { logActivity } = require("../services/activityLog.service");

/** GET /api/admin/inventario - productos con su stock actual, marcando los de stock bajo. */
async function overview(req, res) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { stock: "asc" },
  });
  const withFlag = products.map((p) => ({ ...p, lowStock: p.stock <= p.minStock }));
  res.json({ ok: true, products: withFlag });
}

/** GET /api/admin/inventario/movimientos?productoId=# - historial de movimientos. */
async function listMovements(req, res) {
  const where = {};
  if (req.query.productoId) where.productId = Number(req.query.productoId);

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ ok: true, movements });
}

/**
 * POST /api/admin/inventario/movimiento
 * Body: { productId, type: "ENTRADA"|"SALIDA"|"AJUSTE"|"DEVOLUCION", quantity, reason }
 * ENTRADA y DEVOLUCION suman al stock; SALIDA resta; AJUSTE reemplaza el
 * stock directamente al valor indicado en "quantity" (ajuste absoluto).
 */
async function registerMovement(req, res) {
  const { productId, type, quantity, reason } = req.body;
  if (!productId || !type || quantity == null) {
    throw new AppError("productId, type y quantity son obligatorios.");
  }
  if (!Object.values(MOVEMENT_TYPES).includes(type) || type === MOVEMENT_TYPES.VENTA) {
    // VENTA queda excluido: ese tipo lo genera el sistema automaticamente
    // al confirmar una compra (ver stock.service.js), no se registra a mano.
    throw new AppError("Tipo de movimiento invalido.");
  }

  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw new AppError("Producto no encontrado.", 404);

  const qty = Number(quantity);
  let newStock;
  if (type === MOVEMENT_TYPES.ENTRADA || type === MOVEMENT_TYPES.DEVOLUCION) {
    newStock = product.stock + qty;
  } else if (type === MOVEMENT_TYPES.SALIDA) {
    if (qty > product.stock) throw new AppError(`No puedes retirar ${qty} unidades: solo hay ${product.stock} en stock.`);
    newStock = product.stock - qty;
  } else {
    // AJUSTE: "quantity" es el stock final deseado, no una cantidad a sumar/restar.
    newStock = qty;
  }
  if (newStock < 0) throw new AppError("El stock no puede quedar negativo.");

  const [updatedProduct, movement] = await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { stock: newStock } }),
    prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type,
        quantity: type === MOVEMENT_TYPES.AJUSTE ? Math.abs(newStock - product.stock) : qty,
        reason: reason || null,
        userId: req.user.id,
      },
    }),
  ]);

  await logActivity({
    userId: req.user.id,
    action: "INVENTORY_MOVEMENT",
    entity: "Product",
    entityId: product.id,
    oldValue: { stock: product.stock },
    newValue: { stock: newStock, type, reason },
  });

  res.status(201).json({ ok: true, product: updatedProduct, movement });
}

module.exports = { overview, listMovements, registerMovement };
