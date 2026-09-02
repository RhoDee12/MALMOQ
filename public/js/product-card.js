// ============================================================================
// product-card.js - genera el HTML de una tarjeta de producto
// ============================================================================
// Se usa tanto en el Home (destacados) como en el catalogo de productos,
// para no repetir el mismo bloque de HTML en dos lugares distintos.
// ============================================================================

/**
 * Construye el HTML INTERNO de una tarjeta de producto (sin el contenedor
 * de layout alrededor). Lo usan renderProductCard (grilla) y
 * renderProductCardCarrusel (carrusel horizontal) para no duplicar el
 * marcado de la tarjeta en si.
 * @param {object} product - producto tal como lo devuelve la API (incluye effectivePrice)
 */
function renderProductCardInner(product) {
  const tienePromo = product.effectivePrice < product.price;
  const porcentajeOff = tienePromo ? Math.round((1 - product.effectivePrice / product.price) * 100) : 0;
  const sinStock = product.stock <= 0;
  const stockBajo = !sinStock && product.stock <= product.minStock;
  const imagen = product.imageUrl || "/img/placeholder-producto.svg";

  return `
    <div class="producto-card">
      <a href="/producto.html?id=${product.id}" class="producto-img-wrap position-relative d-block">
        <img src="${imagen}" alt="${escapeHtml(product.name)}" loading="lazy"
             onerror="this.onerror=null;this.src='/img/placeholder-producto.svg';">
        ${tienePromo ? `<span class="badge badge-oferta-grande position-absolute top-0 start-0 m-2">Oferta ${porcentajeOff > 0 ? `-${porcentajeOff}%` : ""}</span>` : ""}
        ${sinStock ? '<span class="badge badge-agotado position-absolute top-0 end-0 m-2">Agotado</span>' : ""}
        ${!sinStock && stockBajo ? '<span class="badge badge-stock-bajo position-absolute top-0 end-0 m-2">Pocas unidades</span>' : ""}
      </a>
      <div class="producto-body">
        <span class="producto-marca">${escapeHtml(product.brand?.name || product.category?.name || "")}</span>
        <a href="/producto.html?id=${product.id}" class="producto-nombre text-body text-decoration-none">${escapeHtml(product.name)}</a>
        <div class="mb-2">
          <span class="precio-actual">S/ ${product.effectivePrice.toFixed(2)}</span>
          ${tienePromo ? `<span class="precio-tachado">S/ ${product.price.toFixed(2)}</span>` : ""}
          ${tienePromo ? `<span class="precio-descuento-pct d-block">Ahorras ${porcentajeOff}%</span>` : ""}
        </div>
        <button class="btn btn-primary btn-sm mt-auto" ${sinStock ? "disabled" : ""}
                onclick="agregarAlCarritoDesdeTarjeta(${product.id})">
          ${sinStock ? "Sin stock" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  `;
}

/**
 * Tarjeta de producto para una grilla Bootstrap (usar dentro de un
 * contenedor con clase "row row-cols-...").
 */
function renderProductCard(product) {
  return `<div class="col">${renderProductCardInner(product)}</div>`;
}

/**
 * Tarjeta de producto para un carrusel horizontal (usar dentro de un
 * contenedor con clase "carrusel-pista", ver public/css/style.css).
 */
function renderProductCardCarrusel(product) {
  return `<div class="carrusel-item item-producto">${renderProductCardInner(product)}</div>`;
}

/** Handler generico usado por el boton "Agregar al carrito" de las tarjetas. */
async function agregarAlCarritoDesdeTarjeta(productId) {
  try {
    const { product } = await apiFetch(`/productos/${productId}`);
    cartAddItem(product, 1);
    mostrarToast(`"${product.name}" se agrego al carrito.`);
  } catch (err) {
    mostrarToast(err.message, true);
  }
}

/** Toast simple (Bootstrap) para avisos rapidos, sin depender de librerias extra. */
function mostrarToast(message, isError = false) {
  let container = document.getElementById("toast-container-malmoq");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container-malmoq";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = 1080;
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-white ${isError ? "bg-danger" : "bg-dark"} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}
