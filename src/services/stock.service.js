// ============================================================================
// SERVICIO DE CONTROL DE STOCK (requisito critico del negocio)
// ============================================================================
// Regla de oro: el stock SIEMPRE se verifica y descuenta en el backend,
// contra la base de datos, nunca confiando en lo que el navegador cree que
// hay disponible. Si dos clientes compran el ultimo producto al mismo
// tiempo, esta funcion debe garantizar que solo uno se quede con el stock.
//
// Como se logra la seguridad ante concurrencia:
// En vez de "leer stock, restar en JavaScript, y luego guardar" (lo cual
// tiene una ventana de tiempo donde dos pedidos podrian leer el mismo
// stock antes de que ninguno haya descontado todavia), se usa un UPDATE
// condicional: "descuenta el stock SOLO SI stock >= cantidad pedida",
// todo en una sola instruccion atomica de la base de datos. Si la
// condicion no se cumple, la actualizacion afecta 0 filas y sabemos que
// no hay stock suficiente - sin necesidad de "reservar" nada antes.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { MOVEMENT_TYPES, SALE_TYPES } = require("../constants");

/**
 * El stock de un producto SIEMPRE se cuenta en unidades sueltas, nunca en
 * cajas (ver comentario en Product.unitsPerBox del schema). Esta funcion
 * traduce "cuantas unidades de venta" (botellas o cajas) a "cuantas
 * unidades de stock" reales se necesitan/mueven.
 * @param {number} quantity - cantidad de UNIDADES o de CAJAS
 * @param {string} saleType - SALE_TYPES.UNIDAD o SALE_TYPES.CAJA
 * @param {number|null} unitsPerBox - unidades que trae una caja de ese producto
 */
function unitsFor(quantity, saleType, unitsPerBox) {
  return saleType === SALE_TYPES.CAJA ? quantity * (unitsPerBox || 0) : quantity;
}

/**
 * Verifica (sin descontar) si hay stock suficiente de una lista de items.
 * Se usa por ejemplo al mostrar el carrito, para avisar temprano si algo
 * ya no esta disponible - pero el descuento real y la verificacion final
 * SIEMPRE vuelven a ocurrir en decrementStockForSale, al confirmar la compra.
 *
 * @param {Array<{productId:number, quantity:number, saleType?:string}>} items
 * @returns {Promise<Array<{productId:number, name:string, requested:number, available:number}>>}
 *          lista de items CON problema de stock (vacia si todo esta bien)
 */
async function findInsufficientStock(items) {
  const problems = [];
  for (const item of items) {
    const saleType = item.saleType || SALE_TYPES.UNIDAD;
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.isActive) {
      problems.push({ productId: item.productId, name: product?.name ?? "producto", requested: item.quantity, available: 0 });
      continue;
    }
    const needed = unitsFor(item.quantity, saleType, product.unitsPerBox);
    if (product.stock < needed) {
      problems.push({ productId: item.productId, name: product.name, requested: item.quantity, available: product.stock });
    }
  }
  return problems;
}

/**
 * Descuenta stock de forma segura para una venta/pedido, dentro de una
 * transaccion. Si CUALQUIER producto no tiene stock suficiente en el
 * momento exacto de confirmar, se revierte TODO (no se descuenta nada a
 * medias) y se lanza un AppError 409 con el detalle.
 *
 * @param {Array<{productId:number, quantity:number}>} items
 * @param {{userId:number, saleId?:number, reason?:string}} context - quien y por que
 * @returns {Promise<void>}
 */
async function decrementStockForSale(items, context) {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const saleType = item.saleType || SALE_TYPES.UNIDAD;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const needed = unitsFor(item.quantity, saleType, product?.unitsPerBox);

      // updateMany con condicion "stock >= cantidad" en el WHERE: es la
      // parte clave que evita vender de mas si hay pedidos simultaneos.
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: needed } },
        data: { stock: { decrement: needed } },
      });

      if (result.count === 0) {
        // O el producto no existe, o ya no tenia suficiente stock: se
        // averigua cual para dar un mensaje util, y se aborta todo.
        const available = product ? product.stock : 0;
        const name = product ? product.name : `producto #${item.productId}`;
        throw new AppError(
          `Lo sentimos, la cantidad seleccionada de "${name}" ya no esta disponible (quedan ${available}).`,
          409
        );
      }

      // Se registra el movimiento de inventario para trazabilidad/auditoria
      // (siempre en unidades reales, aunque se haya vendido por caja).
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: MOVEMENT_TYPES.VENTA,
          quantity: needed,
          reason: context.reason ?? "Venta",
          userId: context.userId ?? null,
          saleId: context.saleId ?? null,
        },
      });
    }
  });
}

module.exports = { findInsufficientStock, decrementStockForSale, unitsFor };
