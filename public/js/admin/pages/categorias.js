// ============================================================================
// categorias.js - CRUD de categorias en el panel (admin/categorias.html)
// ============================================================================

let editandoId = null; // id de la categoria cuyo nombre se esta editando ahora mismo (o null)

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
      <td>
        ${editandoId === c.id ? `
          <div class="d-flex gap-1">
            <input type="text" value="${escapeHtml(c.name)}" class="form-control form-control-sm" id="edit-nombre-${c.id}" style="min-width:140px;">
            <button class="btn btn-sm btn-admin-primary" onclick="guardarNombre(${c.id})">Guardar</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="cancelarEdicion()">Cancelar</button>
          </div>
        ` : escapeHtml(c.name)}
      </td>
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
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary" onclick="editarCategoria(${c.id})">Editar</button>
          <button class="btn btn-sm btn-outline-${c.isActive ? "secondary" : "success"}" onclick="toggleActivo(${c.id}, ${!c.isActive})">
            ${c.isActive ? "Desactivar" : "Activar"}
          </button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">No hay categorias.</td></tr>`;
}

function editarCategoria(id) {
  editandoId = id;
  cargarCategorias();
}

function cancelarEdicion() {
  editandoId = null;
  cargarCategorias();
}

async function guardarNombre(id) {
  const input = document.getElementById(`edit-nombre-${id}`);
  const name = input.value.trim();
  if (!name) return alert("El nombre no puede estar vacio.");
  try {
    await apiFetch(`/admin/categorias/${id}`, { method: "PUT", body: { name } });
    editandoId = null;
    cargarCategorias();
  } catch (err) {
    alert(err.message);
  }
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
