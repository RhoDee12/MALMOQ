// ============================================================================
// reportes.js - modulo de reportes (admin/reportes.html, solo JEFE)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage({ jefeOnly: true });
  if (!user) return;

  cargarReportes();
  document.getElementById("btn-filtrar-reportes").addEventListener("click", cargarReportes);
});

function rangoFechas() {
  const desde = document.getElementById("rep-desde").value;
  const hasta = document.getElementById("rep-hasta").value;
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  return params.toString();
}

async function cargarReportes() {
  const query = rangoFechas();
  await Promise.all([cargarMediosPago(query), cargarTopProductos(query), cargarDetalleVentas(query)]);
}

async function cargarMediosPago(query) {
  const tbody = document.getElementById("tabla-medios-pago");
  try {
    const { rows } = await apiFetch(`/admin/reportes/medios-pago?${query}`);
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.medioPago}</td>
        <td>${r.cantidadVentas}</td>
        <td>S/ ${r.ventas.toFixed(2)}</td>
        <td>S/ ${r.comision.toFixed(2)}</td>
        <td>S/ ${r.neto.toFixed(2)}</td>
      </tr>
    `).join("") || `<tr><td colspan="5" class="text-center text-muted py-3">Sin datos en este rango.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}

async function cargarTopProductos(query) {
  try {
    const { productos, categorias } = await apiFetch(`/admin/reportes/mas-vendidos?${query}`);
    document.getElementById("lista-top-productos").innerHTML = productos.map((p) => `<li>${escapeHtml(p.name)} - ${p.unidades} unid. (S/ ${p.total.toFixed(2)})</li>`).join("") || "<li>Sin datos.</li>";
    document.getElementById("lista-top-categorias").innerHTML = categorias.map((c) => `<li>${escapeHtml(c.categoria)} - ${c.unidades} unid. (S/ ${c.total.toFixed(2)})</li>`).join("") || "<li>Sin datos.</li>";
  } catch (err) {
    console.error(err);
  }
}

async function cargarDetalleVentas(query) {
  const tbody = document.getElementById("tabla-detalle-ventas");
  try {
    const { sales, totals, count } = await apiFetch(`/admin/reportes/ventas?${query}`);
    document.getElementById("reporte-ventas-total").textContent = `${count} venta(s) - Total: S/ ${totals.total.toFixed(2)}`;
    tbody.innerHTML = sales.map((s) => `
      <tr>
        <td>${new Date(s.createdAt).toLocaleDateString("es-PE")}</td>
        <td>${s.channel === "ONLINE" ? "Online" : "Presencial"}</td>
        <td>${s.paymentMethod?.type || "-"}</td>
        <td>S/ ${s.subtotal.toFixed(2)}</td>
        <td>S/ ${s.igvAmount.toFixed(2)}</td>
        <td>S/ ${s.commissionAmount.toFixed(2)}</td>
        <td>S/ ${s.total.toFixed(2)}</td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="text-center text-muted py-3">Sin ventas en este rango.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
