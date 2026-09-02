// ============================================================================
// ventas.js - punto de venta presencial (POS) en el panel (admin/ventas.html)
// ============================================================================
// El carrito de esta pantalla vive en una variable de JavaScript (NO en
// localStorage, para no mezclarlo con el carrito del cliente online). Se
// pierde si se recarga la pagina a proposito - una venta a medio hacer no
// deberia sobrevivir un refresh accidental.
// ============================================================================

let productosPos = [];
let carritoPos = []; // [{ productId, name, unitPrice, quantity, stockDisponible }]
let mediosPagoPos = [];

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;

  await Promise.all([cargarProductosPos(), cargarMediosPagoPos()]);
  cargarHistorialVentas();

  document.getElementById("pos-buscador").addEventListener("input", (e) => buscarProductosPos(e.target.value));
  document.getElementById("btn-registrar-venta").addEventListener("click", registrarVenta);
});

async function cargarProductosPos() {
  const { products } = await apiFetch("/admin/productos");
  productosPos = products.filter((p) => p.isActive);
}

function buscarProductosPos(texto) {
  const cont = document.getElementById("pos-resultados");
  const t = texto.trim().toLowerCase();
  if (!t) { cont.innerHTML = ""; return; }

  const encontrados = productosPos.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)).slice(0, 15);
  cont.innerHTML = encontrados.map((p) => `
    <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="agregarAlPos(${p.id})">
      <span>${escapeHtml(p.name)} <small class="text-secondary">(${p.stock} disp.)</small></span>
      <strong>S/ ${p.price.toFixed(2)}</strong>
    </button>
  `).join("") || `<p class="text-muted small px-2">Sin resultados.</p>`;
}

function agregarAlPos(productId) {
  const p = productosPos.find((x) => x.id === productId);
  if (!p) return;
  const existing = carritoPos.find((i) => i.productId === productId);
  if (existing) {
    if (existing.quantity + 1 > p.stock) return alert("No hay suficiente stock.");
    existing.quantity += 1;
  } else {
    if (p.stock <= 0) return alert("Sin stock.");
    carritoPos.push({ productId: p.id, name: p.name, unitPrice: p.price, quantity: 1, stockDisponible: p.stock });
  }
  renderCarritoPos();
}

function renderCarritoPos() {
  const cont = document.getElementById("pos-carrito");
  if (carritoPos.length === 0) {
    cont.innerHTML = `<p class="text-muted small">Aun no agregaste productos.</p>`;
  } else {
    cont.innerHTML = carritoPos.map((i) => `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small">${escapeHtml(i.name)}</span>
        <div class="d-flex align-items-center gap-1">
          <input type="number" min="1" max="${i.stockDisponible}" value="${i.quantity}" class="form-control form-control-sm" style="width:60px;"
                 onchange="cambiarCantidadPos(${i.productId}, this.value)">
          <button class="btn btn-sm btn-outline-danger" onclick="quitarDelPos(${i.productId})">&times;</button>
        </div>
      </div>
    `).join("");
  }
  const total = carritoPos.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  document.getElementById("pos-total").textContent = `S/ ${total.toFixed(2)}`;
}

function cambiarCantidadPos(productId, value) {
  const item = carritoPos.find((i) => i.productId === productId);
  if (!item) return;
  const qty = Math.max(1, Math.min(item.stockDisponible, Number(value) || 1));
  item.quantity = qty;
  renderCarritoPos();
}

function quitarDelPos(productId) {
  carritoPos = carritoPos.filter((i) => i.productId !== productId);
  renderCarritoPos();
}

async function cargarMediosPagoPos() {
  const { methods } = await apiFetch("/admin/medios-pago");
  mediosPagoPos = methods.filter((m) => m.isActive);
  const nombres = { EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin", TARJETA_POCKET_POS: "Tarjeta (Pocket POS)" };
  document.getElementById("pos-medio-pago").innerHTML = mediosPagoPos.map((m) => `<option value="${m.id}">${nombres[m.type] || m.type}</option>`).join("");
}

async function registrarVenta() {
  if (carritoPos.length === 0) return alert("Agrega al menos un producto.");
  const btn = document.getElementById("btn-registrar-venta");
  btn.disabled = true;

  try {
    await apiFetch("/admin/ventas", {
      method: "POST",
      body: {
        items: carritoPos.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethodId: Number(document.getElementById("pos-medio-pago").value),
        customerName: document.getElementById("pos-cliente").value.trim() || undefined,
      },
    });

    alert("Venta registrada correctamente.");
    carritoPos = [];
    renderCarritoPos();
    document.getElementById("pos-cliente").value = "";
    await cargarProductosPos(); // refresca stock disponible
    cargarHistorialVentas();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
}

async function cargarHistorialVentas() {
  const tbody = document.getElementById("tabla-ventas");
  try {
    const { sales } = await apiFetch("/admin/ventas");
    tbody.innerHTML = sales.map((s) => `
      <tr class="${s.isVoided ? "text-decoration-line-through text-muted" : ""}">
        <td>${new Date(s.createdAt).toLocaleString("es-PE")}</td>
        <td>${s.channel === "ONLINE" ? "Online" : "Presencial"}</td>
        <td>${s.paymentMethod?.type || "-"}</td>
        <td>S/ ${s.total.toFixed(2)}</td>
        <td>${s.receipt?.fullNumber || "-"}</td>
        <td>${!s.isVoided ? `<button class="btn btn-sm btn-outline-danger" onclick="anularVenta(${s.id})">Anular</button>` : "Anulada"}</td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">Aun no hay ventas.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">${err.message}</td></tr>`;
  }
}

async function anularVenta(id) {
  if (!confirm("Anular esta venta? El stock se devolvera automaticamente. Esta accion requiere ser JEFE.")) return;
  try {
    await apiFetch(`/admin/ventas/${id}/anular`, { method: "PUT" });
    cargarHistorialVentas();
  } catch (err) {
    alert(err.message);
  }
}
