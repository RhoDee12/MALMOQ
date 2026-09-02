// ============================================================================
// CONTROLADOR DE REPORTES
// ============================================================================
// Consultas de solo lectura sobre lo ya vendido: dashboard del jefe,
// reporte de ventas y el desglose por medio de pago (con sus comisiones).
// ============================================================================

const prisma = require("../config/prisma");

function dateRangeFilter(query) {
  const where = {};
  if (query.desde || query.hasta) {
    where.createdAt = {};
    if (query.desde) where.createdAt.gte = new Date(query.desde);
    if (query.hasta) where.createdAt.lte = new Date(query.hasta + "T23:59:59");
  }
  return where;
}

/** GET /api/admin/reportes/dashboard - indicadores para el panel del jefe/empleado. */
async function dashboard(req, res) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [salesToday, salesMonth, pendingOrders, lowStockProducts, totalCustomers] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: startOfToday }, isVoided: false } }),
    prisma.sale.findMany({ where: { createdAt: { gte: startOfMonth }, isVoided: false } }),
    prisma.order.count({ where: { status: { in: ["PENDIENTE", "PAGO_PENDIENTE", "PAGO_CONFIRMADO", "PREPARANDO"] } } }),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Product" WHERE "isActive" = 1 AND "stock" <= "minStock"`),
    prisma.customer.count(),
  ]);

  const sum = (arr, field) => arr.reduce((s, x) => s + x[field], 0);

  res.json({
    ok: true,
    dashboard: {
      ventasHoy: sum(salesToday, "total"),
      cantidadVentasHoy: salesToday.length,
      ventasMes: sum(salesMonth, "total"),
      cantidadVentasMes: salesMonth.length,
      igvGeneradoMes: sum(salesMonth, "igvAmount"),
      comisionesMes: sum(salesMonth, "commissionAmount"),
      pedidosPendientes: pendingOrders,
      productosStockBajo: Number(lowStockProducts[0]?.count ?? 0),
      totalClientes: totalCustomers,
    },
  });
}

/** GET /api/admin/reportes/ventas?desde=&hasta=&medioPago=&canal= - listado filtrable. */
async function salesReport(req, res) {
  const where = { ...dateRangeFilter(req.query), isVoided: false };
  if (req.query.canal) where.channel = req.query.canal;
  if (req.query.medioPago) where.paymentMethod = { type: req.query.medioPago };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: { include: { product: true } }, paymentMethod: true, user: true },
    orderBy: { createdAt: "desc" },
  });

  const totals = sales.reduce(
    (acc, s) => {
      acc.subtotal += s.subtotal;
      acc.descuento += s.discountTotal;
      acc.igv += s.igvAmount;
      acc.comision += s.commissionAmount;
      acc.total += s.total;
      return acc;
    },
    { subtotal: 0, descuento: 0, igv: 0, comision: 0, total: 0 }
  );

  res.json({ ok: true, sales, totals, count: sales.length });
}

/**
 * GET /api/admin/reportes/medios-pago?desde=&hasta=
 * Desglose por medio de pago: cuanto se vendio y cuanto se pago de
 * comision en cada uno (ver seccion 27 del brief).
 */
async function paymentMethodsReport(req, res) {
  const where = { ...dateRangeFilter(req.query), isVoided: false };
  const sales = await prisma.sale.findMany({ where, include: { paymentMethod: true } });

  const byMethod = {};
  for (const sale of sales) {
    const key = sale.paymentMethod.type;
    if (!byMethod[key]) byMethod[key] = { medioPago: key, ventas: 0, comision: 0, cantidadVentas: 0 };
    byMethod[key].ventas += sale.total;
    byMethod[key].comision += sale.commissionAmount;
    byMethod[key].cantidadVentas += 1;
  }
  const rows = Object.values(byMethod).map((r) => ({ ...r, neto: r.ventas - r.comision }));

  res.json({ ok: true, rows });
}

/** GET /api/admin/reportes/mas-vendidos?desde=&hasta= - productos y categorias mas vendidos. */
async function topProducts(req, res) {
  const where = { sale: { ...dateRangeFilter(req.query), isVoided: false } };
  const saleItems = await prisma.saleItem.findMany({ where, include: { product: { include: { category: true } } } });

  const byProduct = {};
  const byCategory = {};
  for (const item of saleItems) {
    const p = byProduct[item.productId] ||= { productId: item.productId, name: item.product.name, unidades: 0, total: 0 };
    p.unidades += item.quantity;
    p.total += item.subtotal;

    const catName = item.product.category?.name ?? "Sin categoria";
    const c = byCategory[catName] ||= { categoria: catName, unidades: 0, total: 0 };
    c.unidades += item.quantity;
    c.total += item.subtotal;
  }

  res.json({
    ok: true,
    productos: Object.values(byProduct).sort((a, b) => b.unidades - a.unidades).slice(0, 20),
    categorias: Object.values(byCategory).sort((a, b) => b.unidades - a.unidades),
  });
}

module.exports = { dashboard, salesReport, paymentMethodsReport, topProducts };
