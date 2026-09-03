// ============================================================================
// dashboard.js - logica del dashboard administrativo (admin/dashboard.html)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;
  cargarIndicadores();
  ocultarAccesosSinPermiso(user);
});

/** Oculta los botones de "Accesos rapidos" a los que este usuario no tiene permiso (mismo criterio que el menu lateral). */
function ocultarAccesosSinPermiso(user) {
  if (user.role === "JEFE") return;
  const perm = user.employeeProfile || {};
  document.getElementById("acceso-pedidos").hidden = !perm.canManageOrders;
  document.getElementById("acceso-ventas").hidden = !perm.canRegisterSales;
  document.getElementById("acceso-inventario").hidden = !perm.canManageInventory;
}

async function cargarIndicadores() {
  try {
    const { dashboard } = await apiFetch("/admin/reportes/dashboard");
    document.getElementById("kpi-ventas-hoy").textContent = `S/ ${dashboard.ventasHoy.toFixed(2)}`;
    document.getElementById("kpi-cantidad-hoy").textContent = `${dashboard.cantidadVentasHoy} ventas`;
    document.getElementById("kpi-ventas-mes").textContent = `S/ ${dashboard.ventasMes.toFixed(2)}`;
    document.getElementById("kpi-cantidad-mes").textContent = `${dashboard.cantidadVentasMes} ventas`;
    document.getElementById("kpi-pedidos-pendientes").textContent = dashboard.pedidosPendientes;
    document.getElementById("kpi-stock-bajo").textContent = dashboard.productosStockBajo;
    document.getElementById("kpi-igv-mes").textContent = `S/ ${dashboard.igvGeneradoMes.toFixed(2)}`;
    document.getElementById("kpi-comisiones-mes").textContent = `S/ ${dashboard.comisionesMes.toFixed(2)}`;
    document.getElementById("kpi-total-clientes").textContent = dashboard.totalClientes;
  } catch (err) {
    console.error("No se pudieron cargar los indicadores:", err);
  }
}
