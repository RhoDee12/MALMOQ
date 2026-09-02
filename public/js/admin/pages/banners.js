// ============================================================================
// banners.js - CRUD de banners (admin/banners.html, solo JEFE)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage({ jefeOnly: true });
  if (!user) return;
  cargarBanners();
  document.getElementById("form-banner").addEventListener("submit", crearBanner);
});

async function cargarBanners() {
  const { banners } = await apiFetch("/admin/banners");
  document.getElementById("grid-banners").innerHTML = banners.map((b) => `
    <div class="col-md-4">
      <div class="admin-card">
        <img src="${b.imageUrl}" class="w-100 mb-2" style="height:140px;object-fit:cover;border-radius:8px;">
        <p class="small mb-1">${escapeHtml(b.title || "(sin titulo)")}</p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="badge bg-${b.isActive ? "success" : "secondary"}">${b.isActive ? "Activo" : "Inactivo"}</span>
          <div>
            <button class="btn btn-sm btn-outline-secondary" onclick="toggleBanner(${b.id}, ${!b.isActive})">${b.isActive ? "Desactivar" : "Activar"}</button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarBanner(${b.id})">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  `).join("") || `<p class="text-muted">Aun no hay banners.</p>`;
}

async function crearBanner(e) {
  e.preventDefault();
  try {
    const formData = new FormData();
    const file = document.getElementById("banner-imagen").files[0];
    if (!file) return alert("Selecciona una imagen.");
    formData.append("imagen", file);
    formData.append("title", document.getElementById("banner-titulo").value.trim());
    formData.append("linkUrl", document.getElementById("banner-link").value.trim());
    formData.append("sortOrder", document.getElementById("banner-orden").value);

    await apiUpload("/admin/banners", formData);
    document.getElementById("form-banner").reset();
    cargarBanners();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleBanner(id, nuevoEstado) {
  try {
    await apiFetch(`/admin/banners/${id}`, { method: "PUT", body: { isActive: nuevoEstado } });
    cargarBanners();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarBanner(id) {
  if (!confirm("Eliminar este banner?")) return;
  try {
    await apiFetch(`/admin/banners/${id}`, { method: "DELETE" });
    cargarBanners();
  } catch (err) {
    alert(err.message);
  }
}
