// ============================================================================
// CONTROLADOR DE VENTAS PRESENCIALES
// ============================================================================
// Cuando un cliente compra fisicamente en el local, el empleado registra la
// venta aca. Usa el MISMO inventario que la tienda online (tabla Product /
// Sale unica - ver seccion 23 del brief: "inventario unificado").
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { calculateTotals } = require("../services/pricing.service");
const { unitsFor } = require("../services/stock.service");
const { createReceipt } = require("../services/receipt.service");
const { SALE_CHANNELS, MOVEMENT_TYPES, SALE_TYPES } = require("../constants");

/**
 * POST /api/admin/ventas
 * Body: { items: [{productId, quantity}], paymentMethodId, customerName, customerDoc }
 * Registra una venta de mostrador: valida y descuenta stock, calcula
 * totales (con IGV y comision si corresponde) y genera el comprobante.
 */
async function create(req, res) {
  const { items, paymentMethodId, customerName, customerDoc } = req.body;

  if (!Array.isArray(items) || items.length === 0) throw new AppError("Agrega al menos un producto a la venta.");
  if (!paymentMethodId) throw new AppError("Debes elegir un medio de pago.");

  const productIds = items.map((i) => Number(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productsById = new Map(products.map((p) => [p.id, p]));

  const itemsWithProduct = items.map((i) => {
    const product = productsById.get(Number(i.productId));
    if (!product || !product.isActive) throw new AppError("Uno de los productos ya no esta disponible.", 409);
    const quantity = Number(i.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new AppError(`Cantidad invalida para "${product.name}".`);
    const saleType = i.saleType === SALE_TYPES.CAJA ? SALE_TYPES.CAJA : SALE_TYPES.UNIDAD;
    if (saleType === SALE_TYPES.CAJA && (!product.unitsPerBox || !product.boxPrice)) {
      throw new AppError(`"${product.name}" no esta disponible por caja.`);
    }
    return { product, quantity, saleType };
  });

  const totals = await calculateTotals(itemsWithProduct, Number(paymentMethodId), 0);

  const sale = await prisma.$transaction(async (tx) => {
    // Verificar y descontar stock atomicamente (mismo patron que en pedidos
    // online; si la linea es por CAJA se descuentan las unidades reales).
    for (const { product, quantity, saleType } of itemsWithProduct) {
      const needed = unitsFor(quantity, saleType, product.unitsPerBox);
      const result = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: needed } },
        data: { stock: { decrement: needed } },
      });
      if (result.count === 0) {
        const fresh = await tx.product.findUnique({ where: { id: product.id } });
        throw new AppError(`No hay suficiente stock de "${product.name}" (quedan ${fresh?.stock ?? 0}).`, 409);
      }
    }

    const createdSale = await tx.sale.create({
      data: {
        channel: SALE_CHANNELS.PRESENCIAL,
        userId: req.user.id,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxableBase: totals.taxableBase,
        igvPercent: totals.igvPercent,
        igvAmount: totals.igvAmount,
        commissionPercent: totals.commissionPercent,
        commissionAmount: totals.commissionAmount,
        total: totals.total,
        paymentMethodId: Number(paymentMethodId),
        items: {
          create: totals.lineItems.map((li) => ({
            productId: li.productId,
            saleType: li.saleType,
            quantity: li.quantity,
            boxUnits: li.boxUnits,
            unitPrice: li.unitPrice,
            subtotal: li.subtotal,
          })),
        },
      },
    });

    for (const { product, quantity, saleType } of itemsWithProduct) {
      const needed = unitsFor(quantity, saleType, product.unitsPerBox);
      const detalle = saleType === SALE_TYPES.CAJA ? ` (${quantity} caja x ${product.unitsPerBox})` : "";
      await tx.inventoryMovement.create({
        data: { productId: product.id, type: MOVEMENT_TYPES.VENTA, quantity: needed, reason: `Venta presencial #${createdSale.id}${detalle}`, userId: req.user.id, saleId: createdSale.id },
      });
    }

    await createReceipt(tx, {
      saleId: createdSale.id,
      customerName: customerName || "Cliente varios",
      customerDoc: customerDoc || null,
      total: totals.total,
    });

    return tx.sale.findUnique({
      where: { id: createdSale.id },
      include: { items: { include: { product: true } }, paymentMethod: true, receipt: true },
    });
  });

  res.status(201).json({ ok: true, sale });
}

/** GET /api/admin/ventas/:id - detalle de una venta (para imprimir su comprobante). */
async function getById(req, res) {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, paymentMethod: true, receipt: true, user: true },
  });
  if (!sale) throw new AppError("Venta no encontrada.", 404);
  res.json({ ok: true, sale });
}

/** GET /api/admin/ventas - lista de ventas (online + presenciales) para el panel. */
async function list(req, res) {
  const where = {};
  if (req.query.canal) where.channel = req.query.canal;
  if (req.query.desde || req.query.hasta) {
    where.createdAt = {};
    if (req.query.desde) where.createdAt.gte = new Date(req.query.desde);
    if (req.query.hasta) where.createdAt.lte = new Date(req.query.hasta + "T23:59:59");
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { items: { include: { product: true } }, paymentMethod: true, user: true, receipt: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  res.json({ ok: true, sales });
}

/**
 * PUT /api/admin/ventas/:id/anular
 * Anula una venta (nunca se borra: se marca isVoided=true y se devuelve el
 * stock). Solo JEFE puede anular, por ser una operacion financiera sensible.
 */
async function voidSale(req, res) {
  const id = Number(req.params.id);

  const sale = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new AppError("Venta no encontrada.", 404);
    if (existing.isVoided) throw new AppError("Esta venta ya estaba anulada.");

    for (const item of existing.items) {
      // boxUnits quedo guardado en la propia linea al momento de la venta
      // (no se vuelve a consultar el producto): asi la devolucion es
      // correcta aunque el jefe haya cambiado unitsPerBox despues.
      const restored = unitsFor(item.quantity, item.saleType, item.boxUnits);
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: restored } } });
      await tx.inventoryMovement.create({
        data: { productId: item.productId, type: MOVEMENT_TYPES.DEVOLUCION, quantity: restored, reason: `Anulacion de venta #${id}`, userId: req.user.id, saleId: id },
      });
    }

    return tx.sale.update({ where: { id }, data: { isVoided: true } });
  });

  const { logActivity } = require("../services/activityLog.service");
  await logActivity({ userId: req.user.id, action: "SALE_VOID", entity: "Sale", entityId: id });

  res.json({ ok: true, sale });
}

module.exports = { create, list, getById, voidSale };
