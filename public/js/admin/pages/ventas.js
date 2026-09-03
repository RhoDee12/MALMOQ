// ============================================================================
// ventas.js - punto de venta presencial (POS) en el panel (admin/ventas.html)
// ============================================================================
// El carrito de esta pantalla vive en una variable de JavaScript (NO en
// localStorage, para no mezclarlo con el carrito del cliente online). Se
// pierde si se recarga la pagina a proposito - una venta a medio hacer no
// deberia sobrevivir un refresh accidental.
// ============================================================================

let productosPos = [];
// Cada linea es un producto vendido de UNA forma (UNIDAD o CAJA). Un mismo
// producto puede tener 2 lineas a la vez (ej: 1 caja + 3 unidades sueltas),
// por eso se identifican por productId+saleType, no solo por productId.
// [{ productId, name, saleType, unitPrice, quantity, unitsPerBox }]
let carritoPos = [];
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
    <div class="list-group-item d-flex justify-content-between align-items-center">
      <span>${escapeHtml(p.name)} <small class="text-secondary">(${p.stock} un. disp.)</small></span>
      <div class="d-flex gap-1">
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="agregarAlPos(${p.id}, 'UNIDAD')">
          + Unidad S/ ${p.price.toFixed(2)}
        </button>
        ${p.boxPrice && p.unitsPerBox ? `
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="agregarAlPos(${p.id}, 'CAJA')">
            + Caja (${p.unitsPerBox}) S/ ${p.boxPrice.toFixed(2)}
          </button>
        ` : ""}
      </div>
    </div>
  `).join("") || `<p class="text-muted small px-2">Sin resultados.</p>`;
}

/** Cuantas unidades sueltas ya estan reservadas en el carrito para un producto (sumando sus lineas de UNIDAD y CAJA). */
function unidadesReservadasPos(productId) {
  return carritoPos
    .filter((i) => i.productId === productId)
    .reduce((sum, i) => sum + i.quantity * (i.saleType === "CAJA" ? i.unitsPerBox : 1), 0);
}

function agregarAlPos(productId, saleType) {
  const p = productosPos.find((x) => x.id === productId);
  if (!p) return;
  const unidadesPorLinea = saleType === "CAJA" ? p.unitsPerBox : 1;
  if (unidadesReservadasPos(productId) + unidadesPorLinea > p.stock) return alert("No hay suficiente stock.");

  const existing = carritoPos.find((i) => i.productId === productId && i.saleType === saleType);
  if (existing) {
    existing.quantity += 1;
  } else {
    const unitPrice = saleType === "CAJA" ? p.boxPrice : p.price;
    carritoPos.push({ productId: p.id, name: p.name, saleType, unitPrice, quantity: 1, unitsPerBox: p.unitsPerBox });
  }
  renderCarritoPos();
}

function renderCarritoPos() {
  const cont = document.getElementById("pos-carrito");
  if (carritoPos.length === 0) {
    cont.innerHTML = `<p class="text-muted small">Aun no agregaste productos.</p>`;
  } else {
    cont.innerHTML = carritoPos.map((i, idx) => `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small">${escapeHtml(i.name)} ${i.saleType === "CAJA" ? `<span class="badge bg-secondary">caja x${i.unitsPerBox}</span>` : '<span class="badge bg-light text-dark border">unidad</span>'}</span>
        <div class="d-flex align-items-center gap-1">
          <input type="number" min="1" value="${i.quantity}" class="form-control form-control-sm" style="width:60px;"
                 onchange="cambiarCantidadPos(${idx}, this.value)">
          <button class="btn btn-sm btn-outline-danger" onclick="quitarDelPos(${idx})">&times;</button>
        </div>
      </div>
    `).join("");
  }
  const total = carritoPos.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  document.getElementById("pos-total").textContent = `S/ ${total.toFixed(2)}`;
}

function cambiarCantidadPos(idx, value) {
  const item = carritoPos[idx];
  if (!item) return;
  const p = productosPos.find((x) => x.id === item.productId);
  const unidadesPorLinea = item.saleType === "CAJA" ? item.unitsPerBox : 1;
  const otrasLineas = unidadesReservadasPos(item.productId) - item.quantity * unidadesPorLinea;
  const maxCantidad = Math.max(1, Math.floor((p.stock - otrasLineas) / unidadesPorLinea));
  item.quantity = Math.max(1, Math.min(maxCantidad, Number(value) || 1));
  renderCarritoPos();
}

function quitarDelPos(idx) {
  carritoPos.splice(idx, 1);
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
        items: carritoPos.map((i) => ({ productId: i.productId, quantity: i.quantity, saleType: i.saleType })),
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
        <td>${s.receipt ? `<a href="/boleta.html?tipo=venta&id=${s.id}" target="_blank">${s.receipt.fullNumber}</a>` : "-"}</td>
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
