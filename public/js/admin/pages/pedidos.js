// ============================================================================
// pedidos.js - gestion de pedidos online en el panel (admin/pedidos.html)
// ============================================================================

const ESTADOS_ORDEN = ["PENDIENTE", "PAGO_PENDIENTE", "PAGO_CONFIRMADO", "PREPARANDO", "EN_CAMINO", "LISTO_RECOJO", "ENTREGADO", "CANCELADO"];
const ESTADOS_LABEL = {
  PENDIENTE: "Pendiente", PAGO_PENDIENTE: "Pago pendiente", PAGO_CONFIRMADO: "Pago confirmado",
  PREPARANDO: "Preparando", EN_CAMINO: "En camino", LISTO_RECOJO: "Listo para recojo",
  ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;
  cargarPedidos();
  document.getElementById("filtro-estado").addEventListener("change", cargarPedidos);
});

async function cargarPedidos() {
  const cont = document.getElementById("lista-pedidos-admin");
  const estado = document.getElementById("filtro-estado").value;
  try {
    const { orders } = await apiFetch(`/admin/pedidos${estado ? "?estado=" + estado : ""}`);
    if (orders.length === 0) {
      cont.innerHTML = `<p class="text-muted">No hay pedidos con ese filtro.</p>`;
      return;
    }
    cont.innerHTML = orders.map(renderPedidoAdmin).join("");
    orders.forEach((o) => {
      document.getElementById(`select-estado-${o.id}`)?.addEventListener("change", (e) => cambiarEstado(o.id, e.target.value));
    });
  } catch (err) {
    cont.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function renderPedidoAdmin(order) {
  const cliente = order.user?.customerProfile
    ? `${order.user.customerProfile.firstName} ${order.user.customerProfile.lastName}`
    : order.user?.email;

  return `
    <div class="admin-card">
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
        <div>
          <strong>${order.orderNumber}</strong> &middot; ${escapeHtml(cliente || "")}
          <div class="small text-secondary">${new Date(order.createdAt).toLocaleString("es-PE")} &middot; ${order.deliveryMode === "DELIVERY" ? "Delivery: " + escapeHtml(order.address || "") : "Recojo en tienda"}</div>
        </div>
        <select class="form-select form-select-sm w-auto" id="select-estado-${order.id}">
          ${ESTADOS_ORDEN.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${ESTADOS_LABEL[s]}</option>`).join("")}
        </select>
      </div>
      <ul class="small mb-2">
        ${order.items.map((i) => `<li>${i.quantity} x ${escapeHtml(i.product.name)} - S/ ${i.subtotal.toFixed(2)}</li>`).join("")}
      </ul>
      <div class="d-flex justify-content-between small text-secondary">
        <span>Medio de pago: ${order.paymentMethod?.type || "-"}</span>
        <strong class="text-dark">Total: S/ ${order.total.toFixed(2)}</strong>
      </div>
    </div>
  `;
}

async function cambiarEstado(orderId, nuevoEstado) {
  try {
    await apiFetch(`/admin/pedidos/${orderId}/estado`, { method: "PUT", body: { status: nuevoEstado } });
  } catch (err) {
    alert(err.message);
    cargarPedidos();
  }
}
