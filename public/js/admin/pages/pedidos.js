// ============================================================================
// pedidos.js - gestion de pedidos online en el panel (admin/pedidos.html)
// ============================================================================
// Un pedido se puede "Confirmar" cuando la venta ya se completo de verdad
// (se entrego/cobro). A partir de ahi queda bloqueado: ni el estado ni nada
// mas se puede tocar, salvo el JEFE o un empleado con el permiso especial
// "canEditConfirmedOrders" (ver Empleados). La barrera REAL vive en el
// backend (orders.controller.js / auth.middleware.js) - aca solo se oculta
// o deshabilita lo que el usuario no puede hacer, para que la experiencia
// sea clara.
// ============================================================================

const ESTADOS_ORDEN = ["PENDIENTE", "PAGO_PENDIENTE", "PAGO_CONFIRMADO", "PREPARANDO", "EN_CAMINO", "LISTO_RECOJO", "ENTREGADO", "CANCELADO"];
const ESTADOS_LABEL = {
  PENDIENTE: "Pendiente", PAGO_PENDIENTE: "Pago pendiente", PAGO_CONFIRMADO: "Pago confirmado",
  PREPARANDO: "Preparando", EN_CAMINO: "En camino", LISTO_RECOJO: "Listo para recojo",
  ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};

let usuarioPedidos = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;
  usuarioPedidos = user;
  cargarPedidos();
  document.getElementById("filtro-estado").addEventListener("change", cargarPedidos);
});

function puedeEditarConfirmados() {
  return usuarioPedidos.role === "JEFE" || !!usuarioPedidos.employeeProfile?.canEditConfirmedOrders;
}

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

  // El select se deshabilita si el pedido esta confirmado y este usuario no
  // tiene permiso para tocarlo igual - el backend lo rechazaria de todos
  // modos, esto es solo para no mostrar un control que va a fallar.
  const puedeEditar = !order.isLocked || puedeEditarConfirmados();

  const accionesConfirmacion = order.isLocked
    ? `
      <span class="badge bg-dark">🔒 Venta confirmada</span>
      ${usuarioPedidos.role === "JEFE" ? `<button type="button" class="btn btn-sm btn-outline-secondary" onclick="desbloquearPedido(${order.id})">Desbloquear</button>` : ""}
    `
    : `<button type="button" class="btn btn-sm btn-admin-primary" onclick="confirmarPedido(${order.id})">Confirmar venta</button>`;

  return `
    <div class="admin-card">
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
        <div>
          <strong>${order.orderNumber}</strong> &middot; ${escapeHtml(cliente || "")}
          <div class="small text-secondary">${new Date(order.createdAt).toLocaleString("es-PE")} &middot; ${order.deliveryMode === "DELIVERY" ? "Delivery: " + escapeHtml(order.address || "") : "Recojo en tienda"}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm w-auto" id="select-estado-${order.id}" ${puedeEditar ? "" : "disabled"}>
            ${ESTADOS_ORDEN.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${ESTADOS_LABEL[s]}</option>`).join("")}
          </select>
          ${accionesConfirmacion}
        </div>
      </div>
      <ul class="small mb-2">
        ${order.items.map((i) => `<li>${i.quantity} x ${escapeHtml(i.product.name)} ${i.saleType === "CAJA" ? `<small class="text-secondary">(caja x${i.boxUnits})</small>` : ""} - S/ ${i.subtotal.toFixed(2)}</li>`).join("")}
      </ul>
      <div class="d-flex justify-content-between align-items-center small text-secondary">
        <span>
          Medio de pago: ${order.paymentMethod?.type || "-"}
          ${order.receipt ? ` &middot; <a href="/boleta.html?tipo=pedido&id=${order.id}" target="_blank">Ver comprobante (${order.receipt.fullNumber})</a>` : ""}
        </span>
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

async function confirmarPedido(orderId) {
  if (!confirm("¿Confirmar esta venta? Una vez confirmada queda bloqueada: nadie (salvo el jefe) va a poder editarla.")) return;
  try {
    await apiFetch(`/admin/pedidos/${orderId}/confirmar`, { method: "PUT" });
    cargarPedidos();
  } catch (err) {
    alert(err.message);
  }
}

async function desbloquearPedido(orderId) {
  if (!confirm("¿Desbloquear este pedido? Volvera a quedar editable para cualquier empleado con permiso de pedidos.")) return;
  try {
    await apiFetch(`/admin/pedidos/${orderId}/desbloquear`, { method: "PUT" });
    cargarPedidos();
  } catch (err) {
    alert(err.message);
  }
}
