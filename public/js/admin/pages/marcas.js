// ============================================================================
// marcas.js - CRUD de marcas en el panel (admin/marcas.html)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;
  cargarMarcas();
  document.getElementById("form-marca").addEventListener("submit", crearMarca);
});

async function cargarMarcas() {
  const { brands } = await apiFetch("/marcas");
  const tbody = document.getElementById("tabla-marcas");
  tbody.innerHTML = brands.map((b) => `
    <tr>
      <td>${escapeHtml(b.name)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" onclick="borrarMarca(${b.id})">Eliminar</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="2" class="text-center text-muted py-4">No hay marcas todavia.</td></tr>`;
}

async function crearMarca(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/marcas", {
      method: "POST",
      body: { name: document.getElementById("m-nombre").value.trim() },
    });
    document.getElementById("form-marca").reset();
    cargarMarcas();
  } catch (err) {
    alert(err.message);
  }
}

async function borrarMarca(id) {
  if (!confirm("¿Eliminar esta marca? Los productos que la tengan asignada se quedaran sin marca.")) return;
  try {
    await apiFetch(`/admin/marcas/${id}`, { method: "DELETE" });
    cargarMarcas();
  } catch (err) {
    alert(err.message);
  }
}
