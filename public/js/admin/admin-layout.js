// ============================================================================
// admin-layout.js - sidebar + topbar comunes a TODAS las paginas del panel
// ============================================================================
// Cada pagina de public/admin/*.html solo pone <div id="admin-shell"></div>
// con el contenido especifico adentro de <template id="admin-page-content">,
// y esta funcion arma el layout completo (sidebar + topbar) alrededor.
//
// SEGURIDAD: este chequeo de rol es solo para la EXPERIENCIA (ocultar
// enlaces, redirigir si no corresponde) - la proteccion real esta en el
// backend (requireAuth + requireRole en cada ruta /api/admin/*). Un
// empleado no deberia poder ver la pagina de Empleados aunque conozca la
// URL, pero aunque la viera, la API igual le rechazaria las peticiones.
// ============================================================================

const ADMIN_MENU = [
  { section: "General" },
  { href: "/admin/dashboard.html", label: "Dashboard", icon: "📊" },
  { section: "Catalogo" },
  { href: "/admin/productos.html", label: "Productos", icon: "🍾" },
  { href: "/admin/categorias.html", label: "Categorias", icon: "🏷️" },
  { href: "/admin/inventario.html", label: "Inventario", icon: "📦" },
  { section: "Ventas" },
  { href: "/admin/pedidos.html", label: "Pedidos online", icon: "🛒" },
  { href: "/admin/ventas.html", label: "Ventas / POS", icon: "💵" },
  { href: "/admin/clientes.html", label: "Clientes", icon: "👥" },
  { section: "Contenido", jefeOnly: true },
  { href: "/admin/promociones.html", label: "Promociones", icon: "🎉", jefeOnly: true },
  { href: "/admin/banners.html", label: "Banners", icon: "🖼️", jefeOnly: true },
  { section: "Administracion", jefeOnly: true },
  { href: "/admin/empleados.html", label: "Empleados", icon: "🧑‍💼", jefeOnly: true },
  { href: "/admin/reportes.html", label: "Reportes", icon: "📈", jefeOnly: true },
  { href: "/admin/configuracion.html", label: "Configuracion", icon: "⚙️", jefeOnly: true },
];

let currentAdminUser = null;

/**
 * Verifica sesion + rol (EMPLEADO o JEFE), y si es valido arma el layout
 * completo del panel alrededor del contenido de la pagina.
 * @param {{jefeOnly?: boolean}} [options] - si jefeOnly=true, un EMPLEADO es rechazado tambien.
 * @returns {Promise<object|null>} el usuario logueado, o null si redirigio
 */
async function initAdminPage(options = {}) {
  try {
    const { user } = await apiFetch("/auth/me");
    if (user.role !== "EMPLEADO" && user.role !== "JEFE") {
      window.location.href = "/login.html";
      return null;
    }
    if (options.jefeOnly && user.role !== "JEFE") {
      alert("Solo el Jefe puede acceder a esta seccion.");
      window.location.href = "/admin/dashboard.html";
      return null;
    }
    currentAdminUser = user;
    renderAdminShell(user);
    return user;
  } catch {
    window.location.href = "/login.html";
    return null;
  }
}

function renderAdminShell(user) {
  const shell = document.getElementById("admin-shell");
  const pageTemplate = document.getElementById("admin-page-content");
  const pageTitle = document.body.dataset.pageTitle || "Panel administrativo";
  const currentPath = window.location.pathname;

  const menuHtml = ADMIN_MENU
    .filter((item) => !item.jefeOnly || user.role === "JEFE")
    .map((item) => {
      if (item.section) return `<div class="nav-section-title">${item.section}</div>`;
      const active = currentPath === item.href ? "active" : "";
      return `<a class="nav-link ${active}" href="${item.href}">${item.icon} ${item.label}</a>`;
    })
    .join("");

  shell.innerHTML = `
    <div class="row g-0">
      <aside class="col-md-3 col-lg-2 admin-sidebar d-flex flex-column">
        <a href="/admin/dashboard.html" class="brand">MALMOQ <small>Panel administrativo</small></a>
        <nav class="nav flex-column flex-grow-1">${menuHtml}</nav>
        <div class="px-3 pt-3 border-top border-secondary">
          <a href="/index.html" class="nav-link text-white-50 small">&larr; Ver tienda</a>
        </div>
      </aside>
      <div class="col-md-9 col-lg-10">
        <div class="admin-topbar">
          <h4 class="mb-0 font-semibold">${pageTitle}</h4>
          <div class="d-flex align-items-center gap-3">
            <span class="small text-secondary">${escapeHtml(user.email)} &middot; <strong>${user.role}</strong></span>
            <button class="btn btn-sm btn-outline-secondary" id="btn-admin-logout">Salir</button>
          </div>
        </div>
        <div class="admin-content" id="admin-page-body"></div>
      </div>
    </div>
  `;

  document.getElementById("admin-page-body").appendChild(pageTemplate.content.cloneNode(true));
  document.getElementById("btn-admin-logout").addEventListener("click", async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}
