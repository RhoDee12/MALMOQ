// ============================================================================
// catalogo.js - logica de la pagina de catalogo (productos.html)
// ============================================================================
// Lee los filtros de la URL (?q=&categoria=&marca=&soloPromo=&orden=&pagina=),
// los aplica en los controles del formulario, y pide los productos a la API
// cada vez que el usuario cambia un filtro o pagina.
// ============================================================================

let paginaActual = 1;
const PRODUCTOS_POR_PAGINA = 12;

document.addEventListener("DOMContentLoaded", () => {
  cargarOpcionesDeFiltros();
  aplicarFiltrosDesdeUrl();
  buscarYRenderizarProductos();

  document.getElementById("btn-aplicar-filtros").addEventListener("click", () => {
    paginaActual = 1;
    buscarYRenderizarProductos();
  });
});

async function cargarOpcionesDeFiltros() {
  try {
    const [{ categories }, { brands }] = await Promise.all([apiFetch("/categorias"), apiFetch("/marcas")]);
    const selCategoria = document.getElementById("filtro-categoria");
    categories.forEach((c) => selCategoria.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`));

    const selMarca = document.getElementById("filtro-marca");
    brands.forEach((b) => selMarca.insertAdjacentHTML("beforeend", `<option value="${b.id}">${b.name}</option>`));
  } catch (err) {
    console.error("No se pudieron cargar los filtros:", err);
  }
}

/** Pre-llena los controles de filtro segun los parametros que traiga la URL. */
function aplicarFiltrosDesdeUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("categoria")) document.getElementById("filtro-categoria").value = params.get("categoria");
  if (params.get("marca")) document.getElementById("filtro-marca").value = params.get("marca");
  if (params.get("soloPromo") === "1") document.getElementById("filtro-promo").checked = true;
  if (params.get("orden")) document.getElementById("filtro-orden").value = params.get("orden");
  if (params.get("pagina")) paginaActual = Number(params.get("pagina")) || 1;
}

function leerFiltrosActuales() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") || "",
    categoria: document.getElementById("filtro-categoria").value,
    marca: document.getElementById("filtro-marca").value,
    soloPromo: document.getElementById("filtro-promo").checked ? "1" : "",
    orden: document.getElementById("filtro-orden").value,
  };
}

async function buscarYRenderizarProductos() {
  const grid = document.getElementById("productos-grid");
  grid.innerHTML = `<div class="col text-center text-muted py-5">Buscando productos...</div>`;

  const filtros = leerFiltrosActuales();
  const query = new URLSearchParams({
    ...(filtros.q && { q: filtros.q }),
    ...(filtros.categoria && { categoria: filtros.categoria }),
    ...(filtros.marca && { marca: filtros.marca }),
    ...(filtros.soloPromo && { soloPromo: filtros.soloPromo }),
    orden: filtros.orden,
    pagina: paginaActual,
    porPagina: PRODUCTOS_POR_PAGINA,
  });

  try {
    const { products, total } = await apiFetch(`/productos?${query.toString()}`);
    document.getElementById("resultado-contador").textContent = `${total} producto(s) encontrado(s)`;

    if (products.length === 0) {
      grid.innerHTML = `<div class="col text-center text-muted py-5">No se encontraron productos con estos filtros.</div>`;
      document.getElementById("paginacion").innerHTML = "";
      return;
    }

    grid.innerHTML = products.map(renderProductCard).join("");
    renderPaginacion(total);
  } catch (err) {
    grid.innerHTML = `<div class="col text-center text-danger py-5">${err.message}</div>`;
  }
}

function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / PRODUCTOS_POR_PAGINA);
  const cont = document.getElementById("paginacion");
  if (totalPaginas <= 1) { cont.innerHTML = ""; return; }

  let html = "";
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<li class="page-item ${i === paginaActual ? "active" : ""}">
      <a class="page-link" href="#" data-pagina="${i}">${i}</a>
    </li>`;
  }
  cont.innerHTML = html;
  cont.querySelectorAll("a[data-pagina]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      paginaActual = Number(a.dataset.pagina);
      buscarYRenderizarProductos();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}
