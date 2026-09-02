// ============================================================================
// layout.js - arma el header (navbar) y el footer, iguales en toda la tienda
// ============================================================================
// En vez de copiar y pegar el mismo HTML de navbar/footer en cada pagina
// (dificil de mantener - un cambio habria que hacerlo en 10 archivos), cada
// pagina publica solo pone dos contenedores vacios:
//   <div id="site-header"></div>  y  <div id="site-footer"></div>
// y este script los llena en cuanto carga la pagina. Asi el navbar se edita
// UNA sola vez, aca.
// ============================================================================

/** Arma y muestra el navbar + footer + boton flotante de WhatsApp. */
async function renderLayout() {
  renderHeader();
  renderFooter();
  cartUpdateBadge();
  await applySessionToHeader();
  await aplicarConfiguracionGlobal();
}

function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;

  el.innerHTML = `
    <nav class="navbar navbar-expand-lg malmoq-navbar sticky-top">
      <div class="container">
        <a class="navbar-brand" href="/index.html">MALMOQ</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMalmoq">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarMalmoq">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="/index.html">Inicio</a></li>
            <li class="nav-item"><a class="nav-link" href="/productos.html">Productos</a></li>
            <li class="nav-item"><a class="nav-link" href="/productos.html?soloPromo=1">Promociones</a></li>
            <li class="nav-item"><a class="nav-link" href="/index.html#nosotros">Nosotros</a></li>
            <li class="nav-item"><a class="nav-link" href="/index.html#contacto">Contacto</a></li>
          </ul>
          <form class="d-flex me-2" role="search" id="form-buscador" style="max-width:280px;">
            <input class="form-control form-control-sm" type="search" placeholder="Buscar producto..." id="input-buscador">
          </form>
          <ul class="navbar-nav align-items-lg-center gap-lg-2">
            <li class="nav-item position-relative">
              <a class="nav-link" href="/carrito.html">
                🛒 Carrito
                <span id="cart-badge" class="badge rounded-pill bg-danger cart-badge d-none">0</span>
              </a>
            </li>
            <li class="nav-item" id="sesion-nav-item">
              <a class="nav-link" href="/login.html">Iniciar sesion</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  const form = document.getElementById("form-buscador");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("input-buscador").value.trim();
    window.location.href = "/productos.html" + (q ? `?q=${encodeURIComponent(q)}` : "");
  });
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;

  el.innerHTML = `
    <footer class="malmoq-footer" id="contacto">
      <div class="container">
        <div class="row g-4">
          <div class="col-md-4">
            <h5>MALMOQ</h5>
            <p class="small mb-0">Licoreria en Moquegua, Peru. Todo para tus mejores momentos.</p>
          </div>
          <div class="col-md-4">
            <h5>Enlaces</h5>
            <ul class="list-unstyled small">
              <li><a href="/productos.html">Productos</a></li>
              <li><a href="/index.html#nosotros">Nosotros</a></li>
              <li><a href="/mi-cuenta.html">Mi cuenta</a></li>
            </ul>
          </div>
          <div class="col-md-4" id="footer-contacto">
            <h5>Contacto</h5>
            <p class="small mb-0">Cargando datos de contacto...</p>
          </div>
        </div>
        <div class="footer-bottom text-center">
          &copy; ${new Date().getFullYear()} MALMOQ. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  `;
}

/** Muestra "Mi cuenta / Panel / Cerrar sesion" si hay sesion iniciada, segun el rol. */
async function applySessionToHeader() {
  const navItem = document.getElementById("sesion-nav-item");
  if (!navItem) return;

  try {
    const { user } = await apiFetch("/auth/me");
    let links = `<a class="nav-link" href="/mi-cuenta.html">Hola, ${escapeHtml(user.customerProfile?.firstName || user.email)}</a>`;
    if (user.role === "EMPLEADO" || user.role === "JEFE") {
      links += ` <a class="nav-link" href="/admin/dashboard.html">Panel admin</a>`;
    }
    links += ` <a class="nav-link" href="#" id="btn-cerrar-sesion">Salir</a>`;
    navItem.innerHTML = links;
    document.getElementById("btn-cerrar-sesion").addEventListener("click", async (e) => {
      e.preventDefault();
      await apiFetch("/auth/logout", { method: "POST" });
      window.location.href = "/index.html";
    });
  } catch {
    // No hay sesion: se deja el link de "Iniciar sesion" que ya esta por defecto.
  }
}

/**
 * Aplica en una sola pasada lo que depende de "Configuracion" del panel:
 * logo en el navbar, favicon de la pestana, y el boton flotante de WhatsApp.
 * Si el jefe todavia no subio logo/favicon, se deja el texto "MALMOQ" y el
 * favicon por defecto del navegador - no rompe nada.
 */
async function aplicarConfiguracionGlobal() {
  try {
    const { settings } = await apiFetch("/configuracion");
    aplicarLogoNavbar(settings.logoUrl);
    aplicarFavicon(settings.faviconUrl);
    aplicarWhatsappButton(settings.whatsappNumber, settings.whatsappMessage);
  } catch (err) {
    console.error("No se pudo cargar la configuracion del sitio:", err);
  }
}

/** Reemplaza el texto "MALMOQ" del navbar por la imagen del logo, si ya se subio una. */
function aplicarLogoNavbar(logoUrl) {
  if (!logoUrl) return; // sin logo subido todavia: se deja el texto "MALMOQ"
  const brand = document.querySelector(".malmoq-navbar .navbar-brand");
  if (!brand) return;
  brand.innerHTML = `<img src="${logoUrl}" alt="MALMOQ">`;
}

/** Cambia el icono de la pestana del navegador (favicon), si ya se subio uno. */
function aplicarFavicon(faviconUrl) {
  if (!faviconUrl) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

/** Agrega el boton flotante de WhatsApp si el jefe configuro un numero. */
function aplicarWhatsappButton(whatsappNumber, whatsappMessage) {
  if (!whatsappNumber) return;
  const msg = encodeURIComponent(whatsappMessage || "Hola, quisiera hacer una consulta.");
  const a = document.createElement("a");
  a.href = `https://wa.me/${whatsappNumber}?text=${msg}`;
  a.target = "_blank";
  a.rel = "noopener";
  a.className = "whatsapp-float";
  a.innerHTML = "&#128222;";
  a.title = "Escribenos por WhatsApp";
  document.body.appendChild(a);
}

document.addEventListener("DOMContentLoaded", renderLayout);
