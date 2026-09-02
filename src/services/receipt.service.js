// ============================================================================
// SERVICIO DE COMPROBANTES (boletas) Y CORRELATIVOS
// ============================================================================
// Genera el numero de boleta (serie + correlativo, ej: "B001-00000001") de
// forma que nunca se repita, incluso si dos ventas se confirman casi al
// mismo tiempo. La generacion del PDF queda preparada para una fase
// siguiente (ver README "Roadmap") - por ahora se crea el registro con sus
// datos, listo para que un modulo de PDF lo tome despues.
// ============================================================================

const prisma = require("../config/prisma");

const DEFAULT_SERIES = "B001";

/**
 * Obtiene (o crea si no existe) la serie de boletas por defecto, y devuelve
 * el siguiente numero correlativo de forma atomica (a prueba de carreras).
 */
async function getNextReceiptNumber(tx, series = DEFAULT_SERIES) {
  // upsert + increment dentro de la transaccion: si dos ventas piden el
  // siguiente numero "al mismo tiempo", SQLite serializa las escrituras
  // de la transaccion asi que no se pueden repetir numeros.
  const existing = await tx.receiptSeries.findUnique({ where: { series } });
  if (!existing) {
    await tx.receiptSeries.create({ data: { series, lastNumber: 1 } });
    return 1;
  }
  const updated = await tx.receiptSeries.update({
    where: { series },
    data: { lastNumber: { increment: 1 } },
  });
  return updated.lastNumber;
}

/**
 * Crea el registro de comprobante (Receipt) asociado a un pedido o venta.
 * Debe llamarse DENTRO de la misma transaccion que crea el pedido/venta,
 * para que el correlativo y la venta queden sincronizados siempre.
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{orderId?:number, saleId?:number, customerName:string, customerDoc?:string, total:number}} data
 */
async function createReceipt(tx, data) {
  const settings = await tx.siteSettings.findUnique({ where: { id: 1 } });
  const number = await getNextReceiptNumber(tx);
  const fullNumber = `${DEFAULT_SERIES}-${String(number).padStart(8, "0")}`;

  return tx.receipt.create({
    data: {
      series: DEFAULT_SERIES,
      number,
      fullNumber,
      orderId: data.orderId ?? null,
      saleId: data.saleId ?? null,
      customerName: data.customerName,
      customerDoc: data.customerDoc ?? null,
      companyRuc: settings?.companyRuc ?? "",
      companyName: settings?.companyName ?? "MALMOQ",
      total: data.total,
    },
  });
}

module.exports = { createReceipt, getNextReceiptNumber, DEFAULT_SERIES };
