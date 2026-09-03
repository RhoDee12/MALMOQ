// ============================================================================
// producto-detalle.js - logica de la pagina de detalle (producto.html)
// ============================================================================
// Lee el id del producto desde "?id=" en la URL y pinta toda la info.
// ============================================================================

document.addEventListener("DOMContentLoaded", cargarProducto);

async function cargarProducto() {
  const cont = document.getElementById("contenido-producto");
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    cont.innerHTML = `<p class="text-danger">Producto no especificado.</p>`;
    return;
  }

  try {
    const { product: p } = await apiFetch(`/productos/${id}`);
    document.title = `${p.name} - MALMOQ`;

    const tienePromo = p.effectivePrice < p.price;
    const sinStock = p.stock <= 0;
    const vendePorCaja = !!(p.unitsPerBox && p.boxPrice);
    const imagen = p.imageUrl || "/img/placeholder-producto.svg";

    cont.innerHTML = `
      <nav class="small text-secondary mb-3">
        <a href="/index.html">Inicio</a> / <a href="/productos.html">Productos</a> / ${escapeHtml(p.name)}
      </nav>
      <div class="row g-4">
        <div class="col-md-5">
          <img src="${imagen}" alt="${escapeHtml(p.name)}" class="img-fluid rounded-malmoq border"
               onerror="this.onerror=null;this.src='/img/placeholder-producto.svg';">
        </div>
        <div class="col-md-7">
          <span class="producto-marca">${escapeHtml(p.brand?.name || "")}</span>
          <h1 class="font-black">${escapeHtml(p.name)}</h1>
          <p class="text-secondary">${escapeHtml(p.category?.name || "")} ${p.presentation ? "&middot; " + escapeHtml(p.presentation) : ""}</p>

          <div class="mb-3" id="bloque-precio">
            <span class="precio-actual fs-2">S/ ${p.effectivePrice.toFixed(2)}</span>
            ${tienePromo ? `<span class="precio-tachado fs-5">S/ ${p.price.toFixed(2)}</span>` : ""}
            <span class="small text-secondary d-block" id="precio-unidad-label">por unidad</span>
          </div>

          ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}

          <p class="small ${sinStock ? "text-danger" : "text-success"}">
            ${sinStock ? "Sin stock por el momento" : `Disponible (${p.stock} unidades)`}
          </p>

          ${vendePorCaja && !sinStock ? `
            <div class="mb-3">
              <label class="form-label mb-1 small">Se vende como:</label>
              <div class="btn-group d-block" role="group">
                <input type="radio" class="btn-check" name="tipo-venta" id="tipo-unidad" value="UNIDAD" checked>
                <label class="btn btn-outline-secondary btn-sm" for="tipo-unidad">Por unidad (S/ ${p.effectivePrice.toFixed(2)})</label>
                <input type="radio" class="btn-check" name="tipo-venta" id="tipo-caja" value="CAJA">
                <label class="btn btn-outline-secondary btn-sm" for="tipo-caja">Por caja x${p.unitsPerBox} (S/ ${p.boxPrice.toFixed(2)})</label>
              </div>
            </div>
          ` : ""}

          <div class="d-flex align-items-center gap-2 mb-3" ${sinStock ? "hidden" : ""}>
            <label class="form-label mb-0 small">Cantidad:</label>
            <input type="number" id="input-cantidad" class="form-control form-control-sm" style="width:80px;" value="1" min="1" max="${p.stock}">
          </div>

          <button class="btn btn-primary btn-lg" id="btn-agregar-carrito" ${sinStock ? "disabled" : ""}>
            ${sinStock ? "Sin stock" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    `;

    if (!sinStock) {
      // El maximo de "Cantidad" cambia segun se eligio Unidad o Caja
      // (si eliges Caja, el stock disponible en cajas es menor).
      const inputCantidad = document.getElementById("input-cantidad");
      function actualizarMaximoCantidad() {
        const tipo = document.querySelector('input[name="tipo-venta"]:checked')?.value || "UNIDAD";
        const maxCantidad = tipo === "CAJA" ? Math.floor(p.stock / p.unitsPerBox) : p.stock;
        inputCantidad.max = Math.max(1, maxCantidad);
        if (Number(inputCantidad.value) > maxCantidad) inputCantidad.value = Math.max(1, maxCantidad);

        const bloquePrecio = document.getElementById("bloque-precio");
        bloquePrecio.querySelector(".precio-actual").textContent = `S/ ${(tipo === "CAJA" ? p.boxPrice : p.effectivePrice).toFixed(2)}`;
        document.getElementById("precio-unidad-label").textContent = tipo === "CAJA" ? `por caja (${p.unitsPerBox} unidades)` : "por unidad";
      }
      if (vendePorCaja) {
        document.querySelectorAll('input[name="tipo-venta"]').forEach((r) => r.addEventListener("change", actualizarMaximoCantidad));
      }

      document.getElementById("btn-agregar-carrito").addEventListener("click", () => {
        const tipo = document.querySelector('input[name="tipo-venta"]:checked')?.value || "UNIDAD";
        const maxCantidad = tipo === "CAJA" ? Math.floor(p.stock / p.unitsPerBox) : p.stock;
        if (tipo === "CAJA" && maxCantidad < 1) return mostrarToast("No hay stock suficiente para una caja completa.", true);
        const cantidad = Math.max(1, Math.min(maxCantidad, Number(inputCantidad.value) || 1));
        cartAddItem(p, cantidad, tipo);
        mostrarToast(`"${p.name}" se agrego al carrito.`);
      });
    }
  } catch (err) {
    cont.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}
