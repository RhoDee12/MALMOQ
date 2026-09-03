// ============================================================================
// SERVICIO DE CALCULO DE PRECIOS (subtotal, descuento, IGV, comision, total)
// ============================================================================
// Toda venta u pedido pasa por aca para calcular sus montos. Centralizar
// esta logica en un solo lugar evita que el calculo se haga distinto en el
// carrito, el checkout y las ventas presenciales.
//
// Regla de negocio importante (ver seccion 17-19 del brief de MALMOQ):
// el % de IGV y el % de comision del Pocket POS usados se GUARDAN en cada
// venta/pedido tal como estaban en el momento de la compra. Si despues el
// jefe cambia esos porcentajes en Configuracion, las ventas ya hechas NO
// se recalculan ni se modifican - solo afecta a las ventas nuevas.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { PAYMENT_METHOD_TYPES, SALE_TYPES } = require("../constants");

/**
 * Calcula el precio efectivo de UNA unidad de venta (una botella suelta, o
 * una caja cerrada segun "saleType"). El precio de caja es un precio fijo
 * propio (no le aplican promoPrice/discountPercent, que son solo para la
 * unidad suelta) - si se quiere ofrecer una caja en oferta, se edita
 * directamente boxPrice.
 * @param {{price:number, promoPrice:number|null, discountPercent:number|null, boxPrice:number|null}} product
 * @param {string} [saleType] - SALE_TYPES.UNIDAD (default) o SALE_TYPES.CAJA
 * @returns {number}
 */
function getEffectiveUnitPrice(product, saleType = SALE_TYPES.UNIDAD) {
  if (saleType === SALE_TYPES.CAJA) return product.boxPrice;
  if (product.promoPrice != null && product.promoPrice > 0 && product.promoPrice < product.price) {
    return product.promoPrice;
  }
  if (product.discountPercent != null && product.discountPercent > 0) {
    return round2(product.price * (1 - product.discountPercent / 100));
  }
  return product.price;
}

/**
 * Calcula los totales de una lista de items (producto + cantidad + tipo de
 * venta), usando la configuracion tributaria vigente (IGV) y, si el medio
 * de pago es tarjeta, la comision Pocket POS vigente en este momento.
 *
 * @param {Array<{product: object, quantity: number, saleType?: string}>} items - productos, cantidad y si se vendio por unidad o caja
 * @param {number} paymentMethodId - id del PaymentMethod elegido
 * @param {number} [deliveryCost] - costo de envio, si aplica (no lleva IGV aparte, se suma al final)
 * @returns {Promise<object>} totales calculados, listos para guardar en Order/Sale
 */
async function calculateTotals(items, paymentMethodId, deliveryCost = 0) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error("No se encontro la configuracion del sitio (SiteSettings).");

  // 1) Subtotal: suma de (precio efectivo x cantidad) de cada item.
  let subtotal = 0;
  let discountTotal = 0;
  const lineItems = items.map(({ product, quantity, saleType = SALE_TYPES.UNIDAD }) => {
    if (saleType === SALE_TYPES.CAJA && (!product.unitsPerBox || !product.boxPrice)) {
      throw new AppError(`"${product.name}" no esta configurado para venderse por caja.`);
    }
    const unitPrice = getEffectiveUnitPrice(product, saleType);
    const listPrice = saleType === SALE_TYPES.CAJA ? product.boxPrice : product.price;
    const lineSubtotal = round2(unitPrice * quantity);
    const lineDiscount = round2((listPrice - unitPrice) * quantity);
    subtotal += listPrice * quantity;
    discountTotal += lineDiscount;
    return {
      productId: product.id,
      quantity,
      saleType,
      boxUnits: saleType === SALE_TYPES.CAJA ? product.unitsPerBox : null,
      unitPrice,
      subtotal: lineSubtotal,
    };
  });
  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);

  // 2) Base imponible = subtotal - descuento.
  const taxableBase = round2(subtotal - discountTotal);

  // 3) IGV, segun configuracion vigente AHORA MISMO (se guarda el % usado).
  const igvPercent = settings.igvPercent;
  // Si los precios ya incluyen IGV, el monto de IGV va "por dentro" del
  // total (se calcula sobre la base, pero no se suma aparte al total final).
  const igvAmount = round2(taxableBase - taxableBase / (1 + igvPercent / 100));
  const igvAmountIfNotIncluded = round2(taxableBase * (igvPercent / 100));

  // 4) Comision Pocket POS, solo si el medio de pago es tarjeta y tiene una
  // comision vigente configurada (validFrom <= ahora <= validTo o validTo null).
  const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
  if (!paymentMethod) throw new Error("Medio de pago no encontrado.");

  let commissionPercent = 0;
  if (paymentMethod.type === PAYMENT_METHOD_TYPES.TARJETA_POCKET_POS) {
    const now = new Date();
    const activeCommission = await prisma.paymentCommission.findFirst({
      where: {
        paymentMethodId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { validFrom: "desc" },
    });
    commissionPercent = activeCommission ? activeCommission.percent : 0;
  }

  // Base para la venta: si los precios incluyen IGV, el total antes de
  // comision es la base imponible (ya trae el IGV adentro); si no, hay que
  // sumar el IGV aparte.
  const totalBeforeCommission = settings.pricesIncludeIgv
    ? taxableBase
    : round2(taxableBase + igvAmountIfNotIncluded);

  const commissionAmount = round2(totalBeforeCommission * (commissionPercent / 100));
  const total = round2(totalBeforeCommission + commissionAmount + deliveryCost);

  return {
    lineItems,
    subtotal,
    discountTotal,
    taxableBase,
    igvPercent,
    igvAmount: settings.pricesIncludeIgv ? igvAmount : igvAmountIfNotIncluded,
    commissionPercent,
    commissionAmount,
    deliveryCost,
    total,
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { getEffectiveUnitPrice, calculateTotals, round2 };
