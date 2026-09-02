// ============================================================================
// promociones.js - CRUD de promociones (admin/promociones.html, solo JEFE)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage({ jefeOnly: true });
  if (!user) return;
  cargarPromociones();
  document.getElementById("form-promocion").addEventListener("submit", crearPromocion);
});

async function cargarPromociones() {
  const { promotions } = await apiFetch("/admin/promociones");
  document.getElementById("grid-promociones").innerHTML = promotions.map((p) => `
    <div class="col-md-4">
      <div class="admin-card">
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-100 mb-2" style="height:140px;object-fit:cover;border-radius:8px;">` : ""}
        <h6 class="font-semibold mb-1">${escapeHtml(p.title)}</h6>
        <p class="small text-secondary">${escapeHtml(p.description || "")}</p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="badge bg-${p.isActive ? "success" : "secondary"}">${p.isActive ? "Activa" : "Inactiva"}</span>
          <div>
            <button class="btn btn-sm btn-outline-secondary" onclick="togglePromocion(${p.id}, ${!p.isActive})">${p.isActive ? "Desactivar" : "Activar"}</button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarPromocion(${p.id})">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  `).join("") || `<p class="text-muted">Aun no hay promociones.</p>`;
}

async function crearPromocion(e) {
  e.preventDefault();
  try {
    const formData = new FormData();
    formData.append("title", document.getElementById("promo-titulo").value.trim());
    formData.append("description", document.getElementById("promo-descripcion").value.trim());
    if (document.getElementById("promo-desde").value) formData.append("startDate", document.getElementById("promo-desde").value);
    if (document.getElementById("promo-hasta").value) formData.append("endDate", document.getElementById("promo-hasta").value);
    const file = document.getElementById("promo-imagen").files[0];
    if (file) formData.append("imagen", file);

    await apiUpload("/admin/promociones", formData);
    document.getElementById("form-promocion").reset();
    cargarPromociones();
  } catch (err) {
    alert(err.message);
  }
}

async function togglePromocion(id, nuevoEstado) {
  try {
    await apiFetch(`/admin/promociones/${id}`, { method: "PUT", body: { isActive: nuevoEstado } });
    cargarPromociones();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarPromocion(id) {
  if (!confirm("Eliminar esta promocion?")) return;
  try {
    await apiFetch(`/admin/promociones/${id}`, { method: "DELETE" });
    cargarPromociones();
  } catch (err) {
    alert(err.message);
  }
}
