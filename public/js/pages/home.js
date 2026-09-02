// ============================================================================
// home.js - logica de la pagina de inicio (index.html)
// ============================================================================
// Carga: contenido del Hero, categorias, productos destacados/mas vendidos
// y promociones activas - todo desde la API (nada esta escrito a mano en
// el HTML, para que el jefe pueda cambiarlo desde el panel administrativo).
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  cargarHero();
  cargarCategorias();
  cargarDestacados();
  cargarMasVendidos();
  cargarPromociones();
});

/** Trae el titulo/subtitulo/imagen del Home desde la configuracion del sitio. */
async function cargarHero() {
  try {
    const { settings } = await apiFetch("/configuracion");
    document.getElementById("hero-titulo").textContent = settings.heroTitle;
    document.getElementById("hero-subtitulo").textContent = settings.heroSubtitle;
    if (settings.heroImageUrl) {
      document.getElementById("hero-imagen").src = settings.heroImageUrl;
    }
    if (settings.deliveryMinOrder > 0) {
      document.getElementById("info-delivery").textContent =
        `Pedido minimo para delivery: S/ ${settings.deliveryMinOrder.toFixed(2)}. Elige recojo en tienda o delivery a tu direccion al momento de comprar.`;
    }
  } catch (err) {
    console.error("No se pudo cargar la configuracion del Home:", err);
  }
}

async function cargarCategorias() {
  const grid = document.getElementById("categorias-grid");
  try {
    const { categories } = await apiFetch("/categorias");
    if (categories.length === 0) {
      grid.innerHTML = `<div class="col text-center text-muted py-4">Aun no hay categorias.</div>`;
      return;
    }
    grid.innerHTML = categories.map((c) => `
      <div class="col">
        <a href="/productos.html?categoria=${c.id}" class="categoria-card d-block text-decoration-none">
          <img src="${c.imageUrl || "/img/placeholder-producto.svg"}" alt="${c.name}">
          <span>${c.name}</span>
        </a>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<div class="col text-center text-danger py-4">No se pudieron cargar las categorias.</div>`;
  }
}

async function cargarDestacados() {
  const grid = document.getElementById("destacados-grid");
  try {
    const { products } = await apiFetch("/productos?orden=recientes&porPagina=8");
    renderGridProductos(grid, products);
  } catch {
    grid.innerHTML = `<div class="col text-center text-danger py-4">No se pudieron cargar los productos.</div>`;
  }
}

async function cargarMasVendidos() {
  const grid = document.getElementById("mas-vendidos-grid");
  try {
    const { products } = await apiFetch("/productos?orden=masVendidos&porPagina=8");
    renderGridProductos(grid, products);
  } catch {
    grid.innerHTML = `<div class="col text-center text-danger py-4">No se pudieron cargar los productos.</div>`;
  }
}

function renderGridProductos(grid, products) {
  if (products.length === 0) {
    grid.innerHTML = `<div class="col text-center text-muted py-4">Aun no hay productos para mostrar.</div>`;
    return;
  }
  grid.innerHTML = products.map(renderProductCard).join("");
}

async function cargarPromociones() {
  try {
    const { promotions } = await apiFetch("/promociones");
    if (promotions.length === 0) return;
    document.getElementById("promociones-section").hidden = false;
    document.getElementById("promociones-grid").innerHTML = promotions.map((p) => `
      <div class="col-md-4">
        <div class="rounded-malmoq overflow-hidden border h-100">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-100" style="height:160px;object-fit:cover;" alt="${p.title}">` : ""}
          <div class="p-3">
            <h5 class="font-semibold mb-1">${p.title}</h5>
            <p class="text-secondary small mb-0">${p.description || ""}</p>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("No se pudieron cargar las promociones:", err);
  }
}
