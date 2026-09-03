// ============================================================================
// CONTROLADOR DE PEDIDOS (flujo de compra online del cliente)
// ============================================================================
// Este es el controlador mas sensible del sistema: aca se verifica el
// stock en base de datos, se calculan los totales (IGV, comision), se
// descuenta el inventario y se genera la venta + el comprobante, TODO
// dentro de una unica transaccion. Si cualquier paso falla (ej: no hay
// stock suficiente de un producto), no se guarda nada de nada.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { calculateTotals } = require("../services/pricing.service");
const { unitsFor } = require("../services/stock.service");
const { createReceipt } = require("../services/receipt.service");
const { ORDER_STATUSES, DELIVERY_MODES, SALE_CHANNELS, MOVEMENT_TYPES, SALE_TYPES } = require("../constants");

/**
 * POST /api/pedidos
 * Crea un pedido nuevo a partir del carrito del cliente logueado.
 * Body esperado:
 * {
 *   items: [{ productId, quantity }, ...],
 *   deliveryMode: "DELIVERY" | "RECOJO",
 *   address, reference,           // solo si deliveryMode = DELIVERY
 *   deliveryZoneId,                 // opcional, define el costo de envio
 *   paymentMethodId,
 *   customerDoc                     // DNI/RUC para el comprobante (opcional)
 * }
 */
async function create(req, res) {
  const { items, deliveryMode, address, reference, deliveryZoneId, paymentMethodId, customerDoc } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("El carrito esta vacio.");
  }
  if (!Object.values(DELIVERY_MODES).includes(deliveryMode)) {
    throw new AppError("Modalidad de entrega invalida.");
  }
  if (deliveryMode === DELIVERY_MODES.DELIVERY && !address) {
    throw new AppError("La direccion es obligatoria para entrega a domicilio.");
  }
  if (!paymentMethodId) throw new AppError("Debes elegir un medio de pago.");

  // Se cargan los productos reales de la base de datos - NUNCA se confia en
  // precios o nombres que pudiera mandar el navegador en el body.
  const productIds = items.map((i) => Number(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productsById = new Map(products.map((p) => [p.id, p]));

  const itemsWithProduct = items.map((i) => {
    const product = productsById.get(Number(i.productId));
    if (!product || !product.isActive) {
      throw new AppError(`Uno de los productos del carrito ya no esta disponible.`, 409);
    }
    const quantity = Number(i.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(`Cantidad invalida para "${product.name}".`);
    }
    const saleType = i.saleType === SALE_TYPES.CAJA ? SALE_TYPES.CAJA : SALE_TYPES.UNIDAD;
    if (saleType === SALE_TYPES.CAJA && (!product.unitsPerBox || !product.boxPrice)) {
      throw new AppError(`"${product.name}" no esta disponible por caja.`);
    }
    return { product, quantity, saleType };
  });

  // Costo de delivery segun la zona elegida (si aplica).
  let deliveryCost = 0;
  if (deliveryMode === DELIVERY_MODES.DELIVERY && deliveryZoneId) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: Number(deliveryZoneId) } });
    if (zone && zone.isActive) deliveryCost = zone.isFree ? 0 : zone.cost;
  }

  const totals = await calculateTotals(itemsWithProduct, Number(paymentMethodId), deliveryCost);

  const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : req.user.email;

  // ---- Transaccion: verificar+descontar stock, crear pedido, venta y comprobante ----
  const order = await prisma.$transaction(async (tx) => {
    // 1) Verificar y descontar stock de forma atomica por cada producto.
    //    (mismo patron que stock.service.js: UPDATE condicional "stock >= cantidad")
    //    Si la linea es por CAJA, se descuentan las unidades reales que trae
    //    (quantity x unitsPerBox) - el stock siempre se cuenta en unidades sueltas.
    for (const { product, quantity, saleType } of itemsWithProduct) {
      const needed = unitsFor(quantity, saleType, product.unitsPerBox);
      const result = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: needed } },
        data: { stock: { decrement: needed } },
      });
      if (result.count === 0) {
        const fresh = await tx.product.findUnique({ where: { id: product.id } });
        throw new AppError(
          `Lo sentimos, la cantidad seleccionada de "${product.name}" ya no esta disponible (quedan ${fresh?.stock ?? 0}).`,
          409
        );
      }
    }

    // 2) Crear el pedido con sus items y los totales ya calculados.
    const createdOrder = await tx.order.create({
      data: {
        orderNumber: "TEMP", // se reemplaza abajo con un numero basado en el id real
        userId: req.user.id,
        deliveryMode,
        address: deliveryMode === DELIVERY_MODES.DELIVERY ? address : null,
        reference: reference || null,
        deliveryCost: totals.deliveryCost,
        status: ORDER_STATUSES.PENDIENTE,
        paymentMethodId: Number(paymentMethodId),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxableBase: totals.taxableBase,
        igvPercent: totals.igvPercent,
        igvAmount: totals.igvAmount,
        commissionPercent: totals.commissionPercent,
        commissionAmount: totals.commissionAmount,
        total: totals.total,
        items: { create: totals.lineItems },
      },
    });

    const orderNumber = `PED-${String(createdOrder.id).padStart(6, "0")}`;
    await tx.order.update({ where: { id: createdOrder.id }, data: { orderNumber } });

    // 3) Registrar el movimiento de inventario de cada producto (trazabilidad,
    //    siempre en unidades reales aunque se haya vendido por caja).
    for (const { product, quantity, saleType } of itemsWithProduct) {
      const needed = unitsFor(quantity, saleType, product.unitsPerBox);
      const detalle = saleType === SALE_TYPES.CAJA ? ` (${quantity} caja x ${product.unitsPerBox})` : "";
      await tx.inventoryMovement.create({
        data: { productId: product.id, type: MOVEMENT_TYPES.VENTA, quantity: needed, reason: `Pedido ${orderNumber}${detalle}`, userId: req.user.id },
      });
    }

    // 4) Crear la venta asociada (el inventario es UNICO: online y presencial
    //    comparten esta misma tabla "Sale", ver seccion 23 del brief).
    const sale = await tx.sale.create({
      data: {
        channel: SALE_CHANNELS.ONLINE,
        orderId: createdOrder.id,
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

    // 5) Generar el comprobante (boleta) con numero correlativo unico.
    await createReceipt(tx, {
      orderId: createdOrder.id,
      saleId: sale.id,
      customerName,
      customerDoc: customerDoc || null,
      total: totals.total,
    });

    return tx.order.findUnique({
      where: { id: createdOrder.id },
      include: { items: { include: { product: true } }, paymentMethod: true, receipt: true },
    });
  });

  res.status(201).json({ ok: true, order });
}

/** GET /api/pedidos/mios - historial de pedidos del cliente logueado. */
async function listMine(req, res) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } }, paymentMethod: true, receipt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, orders });
}

/** GET /api/pedidos/:id - detalle de un pedido (solo su dueno, o empleado/jefe). */
async function getById(req, res) {
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, paymentMethod: true, receipt: true, payments: true, user: { include: { customerProfile: true } } },
  });
  if (!order) throw new AppError("Pedido no encontrado.", 404);
  const isOwner = order.userId === req.user.id;
  const isStaff = ["EMPLEADO", "JEFE"].includes(req.user.role);
  if (!isOwner && !isStaff) throw new AppError("No tienes permiso para ver este pedido.", 403);
  res.json({ ok: true, order });
}

/** GET /api/admin/pedidos?estado= - lista de pedidos para el panel de empleados/jefe. */
async function listAdmin(req, res) {
  const where = {};
  if (req.query.estado) where.status = req.query.estado;
  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { product: true } }, paymentMethod: true, receipt: true, user: { include: { customerProfile: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, orders });
}

/** Lanza 403 si el pedido esta confirmado (isLocked) y quien pide el cambio no tiene permiso para tocarlo igual. */
async function assertOrderEditable(order, user) {
  if (!order.isLocked) return;
  if (user.role === "JEFE") return;
  const profile = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.canEditConfirmedOrders) {
    throw new AppError("Esta venta ya esta confirmada y cerrada. Solo el jefe (o un empleado con permiso) puede editarla.", 403);
  }
}

/** PUT /api/admin/pedidos/:id/estado - cambia el estado de un pedido (empleado/jefe). */
async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!Object.values(ORDER_STATUSES).includes(status)) throw new AppError("Estado invalido.");

  const before = await prisma.order.findUnique({ where: { id } });
  if (!before) throw new AppError("Pedido no encontrado.", 404);
  await assertOrderEditable(before, req.user);

  const order = await prisma.order.update({ where: { id }, data: { status } });

  const { logActivity } = require("../services/activityLog.service");
  await logActivity({ userId: req.user.id, action: "ORDER_STATUS_CHANGE", entity: "Order", entityId: id, oldValue: { status: before.status }, newValue: { status } });

  res.json({ ok: true, order });
}

/**
 * PUT /api/admin/pedidos/:id/confirmar
 * "Cierra" la venta: a partir de aca el pedido queda bloqueado (ver
 * assertOrderEditable) y ya no se puede tocar salvo por el jefe o un
 * empleado con el permiso canEditConfirmedOrders explicito.
 */
async function confirmOrder(req, res) {
  const id = Number(req.params.id);
  const before = await prisma.order.findUnique({ where: { id } });
  if (!before) throw new AppError("Pedido no encontrado.", 404);
  if (before.isLocked) throw new AppError("Esta venta ya estaba confirmada.");

  const order = await prisma.order.update({
    where: { id },
    data: { isLocked: true, lockedAt: new Date(), lockedById: req.user.id },
  });

  const { logActivity } = require("../services/activityLog.service");
  await logActivity({ userId: req.user.id, action: "ORDER_CONFIRM", entity: "Order", entityId: id });

  res.json({ ok: true, order });
}

/**
 * PUT /api/admin/pedidos/:id/desbloquear
 * Reabre por completo un pedido que se confirmo por error. Reservado a
 * JEFE unicamente (ver orders.routes.js) - un empleado con
 * canEditConfirmedOrders puede EDITAR un pedido ya confirmado sin
 * desbloquearlo (ver assertOrderEditable), pero no quitarle el candado del
 * todo; eso queda como decision exclusiva del jefe.
 */
async function unlockOrder(req, res) {
  const id = Number(req.params.id);
  const before = await prisma.order.findUnique({ where: { id } });
  if (!before) throw new AppError("Pedido no encontrado.", 404);

  const order = await prisma.order.update({
    where: { id },
    data: { isLocked: false, lockedAt: null, lockedById: null },
  });

  const { logActivity } = require("../services/activityLog.service");
  await logActivity({ userId: req.user.id, action: "ORDER_UNLOCK", entity: "Order", entityId: id });

  res.json({ ok: true, order });
}

/**
 * POST /api/pedidos/:id/pago
 * El cliente adjunta su comprobante de pago (Yape/Plin: captura + numero
 * de operacion; tarjeta/efectivo: solo el monto). Requiere el middleware
 * de upload montado en la ruta con el campo "comprobante".
 */
async function attachPayment(req, res) {
  const orderId = Number(req.params.id);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Pedido no encontrado.", 404);
  if (order.userId !== req.user.id) throw new AppError("No tienes permiso sobre este pedido.", 403);

  const { buildPublicUrl } = require("../middleware/upload.middleware");
  const proofUrl = req.file ? buildPublicUrl("comprobantes-pago", req.file.filename) : null;

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount: order.total,
      proofUrl,
      operationNumber: req.body.operationNumber || null,
    },
  });

  await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.PAGO_PENDIENTE } });

  res.status(201).json({ ok: true, payment });
}

/** PUT /api/admin/pagos/:id/verificar - empleado/jefe confirma que el pago es correcto. */
async function verifyPayment(req, res) {
  const id = Number(req.params.id);
  const payment = await prisma.payment.update({
    where: { id },
    data: { isVerified: true, verifiedBy: req.user.id },
  });
  await prisma.order.update({ where: { id: payment.orderId }, data: { status: ORDER_STATUSES.PAGO_CONFIRMADO } });
  res.json({ ok: true, payment });
}

module.exports = { create, listMine, getById, listAdmin, updateStatus, confirmOrder, unlockOrder, attachPayment, verifyPayment };
