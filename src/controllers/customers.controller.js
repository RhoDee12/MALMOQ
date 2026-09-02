// ============================================================================
// CONTROLADOR DE CLIENTES (vista administrativa)
// ============================================================================
// El jefe (y empleados con permiso canViewCustomers) pueden consultar la
// lista de clientes registrados y cuanto le han comprado a la licoreria.
// ============================================================================

const prisma = require("../config/prisma");
const { ROLES } = require("../constants");

/** GET /api/admin/clientes - lista de clientes con resumen de compras. */
async function list(req, res) {
  const customers = await prisma.customer.findMany({
    include: { user: { include: { orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withStats = customers.map((c) => {
    const orders = c.user.orders;
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.user.email,
      createdAt: c.createdAt,
      isActive: c.user.isActive,
      totalPedidos: orders.length,
      totalComprado: orders.reduce((sum, o) => sum + o.total, 0),
    };
  });

  res.json({ ok: true, customers: withStats });
}

module.exports = { list };
