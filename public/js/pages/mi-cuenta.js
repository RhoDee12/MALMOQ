// ============================================================================
// mi-cuenta.js - logica de "Mi cuenta" (mi-cuenta.html)
// ============================================================================
// Muestra los datos del cliente logueado y su historial de pedidos con el
// estado de cada uno. Si no hay sesion, redirige a login.
// ============================================================================

const ESTADOS_LABEL = {
  PENDIENTE: "Pendiente",
  PAGO_PENDIENTE: "Pago pendiente",
  PAGO_CONFIRMADO: "Pago confirmado",
  PREPARANDO: "Preparando pedido",
  EN_CAMINO: "En camino",
  LISTO_RECOJO: "Listo para recojo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};
const ESTADOS_COLOR = {
  PENDIENTE: "secondary", PAGO_PENDIENTE: "warning", PAGO_CONFIRMADO: "info",
  PREPARANDO: "primary", EN_CAMINO: "primary", LISTO_RECOJO: "success",
  ENTREGADO: "success", CANCELADO: "danger",
};

document.addEventListener("DOMContentLoaded", cargarCuenta);

async function cargarCuenta() {
  const cont = document.getElementById("contenido-cuenta");
  try {
    const { user } = await apiFetch("/auth/me");
    const { orders } = await apiFetch("/pedidos/mios");

    cont.innerHTML = `
      <h1 class="font-black mb-4">Mi cuenta</h1>
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="border rounded-malmoq p-3">
            <h5 class="font-semibold">Datos personales</h5>
            <p class="mb-1"><strong>${escapeHtml(user.customerProfile?.firstName || "")} ${escapeHtml(user.customerProfile?.lastName || "")}</strong></p>
            <p class="mb-1 small text-secondary">${escapeHtml(user.email)}</p>
            <p class="mb-1 small text-secondary">${escapeHtml(user.customerProfile?.phone || "Sin telefono registrado")}</p>
            <p class="mb-0 small text-secondary">${escapeHtml(user.customerProfile?.address || "Sin direccion registrada")}</p>
          </div>
        </div>
        <div class="col-lg-8">
          <h5 class="font-semibold mb-3">Historial de pedidos</h5>
          <div id="lista-pedidos">
            ${orders.length === 0 ? '<p class="text-muted">Aun no tienes pedidos.</p>' : orders.map(renderPedido).join("")}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    window.location.href = "/login.html?volver=/mi-cuenta.html";
  }
}

function renderPedido(order) {
  return `
    <div class="border rounded-malmoq p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>${order.orderNumber}</strong>
        <span class="badge bg-${ESTADOS_COLOR[order.status] || "secondary"}">${ESTADOS_LABEL[order.status] || order.status}</span>
      </div>
      <p class="small text-secondary mb-1">${new Date(order.createdAt).toLocaleString("es-PE")} - ${order.deliveryMode === "DELIVERY" ? "Delivery" : "Recojo en tienda"}</p>
      <ul class="small mb-2">
        ${order.items.map((i) => `<li>${i.quantity} x ${escapeHtml(i.product.name)}</li>`).join("")}
      </ul>
      <div class="d-flex justify-content-between">
        <span>Total</span>
        <strong>S/ ${order.total.toFixed(2)}</strong>
      </div>
      ${order.receipt ? `<p class="small text-secondary mb-0">Comprobante: ${order.receipt.fullNumber}</p>` : ""}
    </div>
  `;
}
