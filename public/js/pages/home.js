// ============================================================================
// home.js - logica de la pagina de inicio (index.html)
// ============================================================================
// Carga: carrusel de banners (o hero de respaldo), categorias en circulo,
// productos destacados/mas vendidos en carrusel horizontal, y promociones -
// todo desde la API (nada esta escrito a mano en el HTML, para que el jefe
// pueda cambiarlo desde el panel administrativo).
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  cargarHeroCarousel();
  cargarCategorias();
  cargarDestacados();
  cargarMasVendidos();
  cargarPromociones();

  // Intervalos distintos para que las 3 filas no avancen todas a la vez.
  initCarrusel("categorias-grid", "cat-prev", "cat-next", { intervalMs: 2600 });
  initCarrusel("destacados-grid", "destacados-prev", "destacados-next", { intervalMs: 3200 });
  initCarrusel("mas-vendidos-grid", "vendidos-prev", "vendidos-next", { intervalMs: 3800 });
});

/**
 * Arma el carrusel superior. Si el jefe subio banners (modulo "Banners"
 * del panel), se muestran esos, rotando. Si no hay ninguno, se arma un
 * unico slide de respaldo con el titulo/subtitulo/imagen del Hero
 * (modulo "Configuracion > General").
 */
async function cargarHeroCarousel() {
  const itemsCont = document.getElementById("hero-carousel-items");
  const indicadoresCont = document.getElementById("hero-carousel-indicadores");

  try {
    const [{ banners }, { settings }] = await Promise.all([apiFetch("/banners"), apiFetch("/configuracion")]);

    // Franja de oferta: usa el subtitulo del hero como gancho si existe.
    if (settings.heroSubtitle) {
      document.getElementById("franja-oferta-texto").textContent = settings.heroSubtitle;
      document.getElementById("franja-oferta-wrap").hidden = false;
    }

    const slides = banners.length > 0
      ? banners.map((b) => ({
          imageUrl: b.imageUrl,
          title: b.title || "",
          linkUrl: b.linkUrl || "/productos.html",
        }))
      : [{
          imageUrl: settings.heroImageUrl || "/img/placeholder-producto.svg",
          title: settings.heroTitle || "Todo para tus mejores momentos",
          linkUrl: "/productos.html",
        }];

    itemsCont.innerHTML = slides.map((s, i) => `
      <div class="carousel-item ${i === 0 ? "active" : ""}">
        <a href="${s.linkUrl}">
          <img src="${s.imageUrl}" class="banner-slide-img" alt="${escapeHtml(s.title)}"
               onerror="this.onerror=null;this.src='/img/placeholder-producto.svg';">
        </a>
        ${s.title ? `<div class="banner-caption"><h2>${escapeHtml(s.title)}</h2></div>` : ""}
      </div>
    `).join("");

    if (slides.length > 1) {
      indicadoresCont.innerHTML = slides.map((_, i) =>
        `<button type="button" data-bs-target="#hero-carousel" data-bs-slide-to="${i}" class="${i === 0 ? "active" : ""}"></button>`
      ).join("");
    }

    if (settings.deliveryMinOrder > 0) {
      document.getElementById("info-delivery").textContent =
        `Pedido minimo para delivery: S/ ${settings.deliveryMinOrder.toFixed(2)}. Elige recojo en tienda o delivery a tu direccion al momento de comprar.`;
    }
  } catch (err) {
    console.error("No se pudo cargar el carrusel principal:", err);
    itemsCont.innerHTML = `<div class="carousel-item active"><img src="/img/placeholder-producto.svg" class="banner-slide-img" alt="MALMOQ"></div>`;
  }

  // El HTML no trae "data-bs-ride" a proposito: las slides recien se
  // conocen aca (llegan de la API de forma asincrona), asi que el
  // carrusel se activa a mano DESPUES de insertarlas. Si se dejara
  // data-bs-ride en el HTML, Bootstrap lo inicializaria apenas carga la
  // pagina con el carrusel todavia vacio, y el auto-avance no funcionaria.
  new bootstrap.Carousel(document.getElementById("hero-carousel"), { interval: 4500, ride: "carousel", wrap: true });
}

async function cargarCategorias() {
  const grid = document.getElementById("categorias-grid");
  try {
    const { categories } = await apiFetch("/categorias");
    if (categories.length === 0) {
      grid.innerHTML = `<p class="text-muted py-4">Aun no hay categorias.</p>`;
      return;
    }
    grid.innerHTML = categories.map((c) => `
      <div class="carrusel-item item-categoria">
        <a href="/productos.html?categoria=${c.id}" class="categoria-circulo">
          <span class="circulo-img"><img src="${c.imageUrl || "/img/placeholder-producto.svg"}" alt="${escapeHtml(c.name)}"></span>
          <span>${escapeHtml(c.name)}</span>
        </a>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<p class="text-danger py-4">No se pudieron cargar las categorias.</p>`;
  }
}

async function cargarDestacados() {
  const grid = document.getElementById("destacados-grid");
  try {
    const { products } = await apiFetch("/productos?orden=recientes&porPagina=10");
    renderCarruselProductos(grid, products);
  } catch {
    grid.innerHTML = `<p class="text-danger py-4">No se pudieron cargar los productos.</p>`;
  }
}

async function cargarMasVendidos() {
  const grid = document.getElementById("mas-vendidos-grid");
  try {
    const { products } = await apiFetch("/productos?orden=masVendidos&porPagina=10");
    renderCarruselProductos(grid, products);
  } catch {
    grid.innerHTML = `<p class="text-danger py-4">No se pudieron cargar los productos.</p>`;
  }
}

function renderCarruselProductos(grid, products) {
  if (products.length === 0) {
    grid.innerHTML = `<p class="text-muted py-4">Aun no hay productos para mostrar.</p>`;
    return;
  }
  grid.innerHTML = products.map(renderProductCardCarrusel).join("");
}

async function cargarPromociones() {
  try {
    const { promotions } = await apiFetch("/promociones");
    if (promotions.length === 0) return;
    document.getElementById("promociones-section").hidden = false;
    document.getElementById("promociones-grid").innerHTML = promotions.map((p) => `
      <div class="col-md-4">
        <div class="rounded-malmoq overflow-hidden border h-100">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-100" style="height:160px;object-fit:cover;" alt="${escapeHtml(p.title)}">` : ""}
          <div class="p-3">
            <h5 class="font-semibold mb-1">${escapeHtml(p.title)}</h5>
            <p class="text-secondary small mb-0">${escapeHtml(p.description || "")}</p>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("No se pudieron cargar las promociones:", err);
  }
}
