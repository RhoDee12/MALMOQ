// ============================================================================
// inventario.js - control de stock en el panel (admin/inventario.html)
// ============================================================================

let modalMovimiento = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;

  modalMovimiento = new bootstrap.Modal(document.getElementById("modal-movimiento"));
  cargarInventario();

  document.getElementById("m-tipo").addEventListener("change", actualizarEtiquetaCantidad);
  document.getElementById("form-movimiento").addEventListener("submit", registrarMovimiento);
});

async function cargarInventario() {
  const { products } = await apiFetch("/admin/inventario");
  const tbody = document.getElementById("tabla-inventario");
  tbody.innerHTML = products.map((p) => `
    <tr>
      <td><img src="${p.imageUrl || "/img/placeholder-producto.svg"}" class="thumb-admin"></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category?.name || "-")}</td>
      <td>${p.stock} ${p.lowStock ? '<span class="badge bg-warning text-dark">Stock bajo</span>' : ""}</td>
      <td>${p.minStock}</td>
      <td><button class="btn btn-sm btn-outline-secondary" onclick="abrirModalMovimiento(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Movimiento</button></td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="text-center text-muted py-4">No hay productos.</td></tr>`;
}

function abrirModalMovimiento(productId, nombre) {
  document.getElementById("m-producto-id").value = productId;
  document.getElementById("movimiento-producto-nombre").textContent = nombre;
  document.getElementById("form-movimiento").reset();
  document.getElementById("m-producto-id").value = productId; // reset() lo limpia, se vuelve a poner
  actualizarEtiquetaCantidad();
  modalMovimiento.show();
}

function actualizarEtiquetaCantidad() {
  const tipo = document.getElementById("m-tipo").value;
  document.getElementById("m-cantidad-label").textContent =
    tipo === "AJUSTE" ? "Nuevo stock (valor final)" : "Cantidad";
}

async function registrarMovimiento(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/inventario/movimiento", {
      method: "POST",
      body: {
        productId: Number(document.getElementById("m-producto-id").value),
        type: document.getElementById("m-tipo").value,
        quantity: Number(document.getElementById("m-cantidad").value),
        reason: document.getElementById("m-motivo").value.trim(),
      },
    });
    modalMovimiento.hide();
    cargarInventario();
  } catch (err) {
    alert(err.message);
  }
}
