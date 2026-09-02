// ============================================================================
// clientes.js - listado de clientes en el panel (admin/clientes.html)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;

  try {
    const { customers } = await apiFetch("/admin/clientes");
    document.getElementById("tabla-clientes").innerHTML = customers.map((c) => `
      <tr>
        <td>${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone || "-")}</td>
        <td>${new Date(c.createdAt).toLocaleDateString("es-PE")}</td>
        <td>${c.totalPedidos}</td>
        <td>S/ ${c.totalComprado.toFixed(2)}</td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">Aun no hay clientes registrados.</td></tr>`;
  } catch (err) {
    document.getElementById("tabla-clientes").innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">${err.message}</td></tr>`;
  }
});
