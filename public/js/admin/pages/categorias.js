// ============================================================================
// categorias.js - CRUD de categorias en el panel (admin/categorias.html)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;
  cargarCategorias();
  document.getElementById("form-categoria").addEventListener("submit", crearCategoria);
});

async function cargarCategorias() {
  const { categories } = await apiFetch("/admin/categorias");
  const tbody = document.getElementById("tabla-categorias");
  tbody.innerHTML = categories.map((c) => `
    <tr>
      <td><img src="${c.imageUrl || "/img/placeholder-producto.svg"}" class="thumb-admin"></td>
      <td>${escapeHtml(c.name)}</td>
      <td>
        <input type="number" value="${c.sortOrder}" class="form-control form-control-sm" style="width:70px;"
               onchange="actualizarOrden(${c.id}, this.value)">
      </td>
      <td>${c.isActive ? '<span class="badge bg-success">Activa</span>' : '<span class="badge bg-secondary">Inactiva</span>'}</td>
      <td>
        <input type="file" accept="image/*" class="form-control form-control-sm" style="width:170px;"
               onchange="subirImagenCategoria(${c.id}, this.files[0])">
      </td>
      <td>
        <button class="btn btn-sm btn-outline-${c.isActive ? "secondary" : "success"}" onclick="toggleActivo(${c.id}, ${!c.isActive})">
          ${c.isActive ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">No hay categorias.</td></tr>`;
}

async function crearCategoria(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/categorias", {
      method: "POST",
      body: { name: document.getElementById("c-nombre").value.trim(), sortOrder: Number(document.getElementById("c-orden").value) || 0 },
    });
    document.getElementById("form-categoria").reset();
    cargarCategorias();
  } catch (err) {
    alert(err.message);
  }
}

async function actualizarOrden(id, value) {
  try {
    await apiFetch(`/admin/categorias/${id}`, { method: "PUT", body: { sortOrder: Number(value) } });
  } catch (err) {
    alert(err.message);
  }
}

async function toggleActivo(id, nuevoEstado) {
  try {
    await apiFetch(`/admin/categorias/${id}`, { method: "PUT", body: { isActive: nuevoEstado } });
    cargarCategorias();
  } catch (err) {
    alert(err.message);
  }
}

async function subirImagenCategoria(id, file) {
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append("imagen", file);
    await apiUpload(`/admin/categorias/${id}/imagen`, formData);
    cargarCategorias();
  } catch (err) {
    alert(err.message);
  }
}
