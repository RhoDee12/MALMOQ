// ============================================================================
// empleados.js - gestion de empleados (admin/empleados.html, solo JEFE)
// ============================================================================

let empleadosCache = [];
let modalEmpleado = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage({ jefeOnly: true });
  if (!user) return;

  modalEmpleado = new bootstrap.Modal(document.getElementById("modal-empleado"));
  cargarEmpleados();
  document.getElementById("form-empleado").addEventListener("submit", guardarEmpleado);
});

async function cargarEmpleados() {
  const { employees } = await apiFetch("/admin/empleados");
  empleadosCache = employees;
  document.getElementById("tabla-empleados").innerHTML = employees.map((e) => {
    const perm = e.employeeProfile;
    const permisosActivos = [
      perm?.canManageProducts && "Productos", perm?.canManageInventory && "Inventario",
      perm?.canManageOrders && "Pedidos", perm?.canRegisterSales && "Ventas", perm?.canViewCustomers && "Clientes",
      perm?.canEditConfirmedOrders && "Editar pedidos confirmados",
    ].filter(Boolean).join(", ") || "Sin permisos";

    return `
      <tr>
        <td>${escapeHtml(perm?.firstName || "")} ${escapeHtml(perm?.lastName || "")}</td>
        <td>${escapeHtml(e.email)}</td>
        <td class="small">${permisosActivos}</td>
        <td>${e.isActive ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalEditarEmpleado(${e.id})">Editar</button>
          <button class="btn btn-sm btn-outline-${e.isActive ? "danger" : "success"}" onclick="toggleEmpleadoActivo(${e.id}, ${!e.isActive})">
            ${e.isActive ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="5" class="text-center text-muted py-4">Aun no hay empleados registrados.</td></tr>`;
}

function abrirModalNuevoEmpleado() {
  document.getElementById("form-empleado").reset();
  document.getElementById("e-id").value = "";
  document.getElementById("modal-empleado-titulo").textContent = "Nuevo empleado";
  document.getElementById("grupo-password-nuevo").hidden = false;
  document.getElementById("e-password").required = true;
  document.getElementById("e-email").disabled = false;
}

function abrirModalEditarEmpleado(id) {
  const e = empleadosCache.find((x) => x.id === id);
  if (!e) return;
  const perm = e.employeeProfile;

  document.getElementById("e-id").value = e.id;
  document.getElementById("e-nombre").value = perm?.firstName || "";
  document.getElementById("e-apellidos").value = perm?.lastName || "";
  document.getElementById("e-email").value = e.email;
  document.getElementById("e-email").disabled = true; // el correo no se cambia (es el identificador de login)
  document.getElementById("e-celular").value = perm?.phone || "";
  document.getElementById("e-perm-productos").checked = !!perm?.canManageProducts;
  document.getElementById("e-perm-inventario").checked = !!perm?.canManageInventory;
  document.getElementById("e-perm-pedidos").checked = !!perm?.canManageOrders;
  document.getElementById("e-perm-ventas").checked = !!perm?.canRegisterSales;
  document.getElementById("e-perm-clientes").checked = !!perm?.canViewCustomers;
  document.getElementById("e-perm-editar-confirmados").checked = !!perm?.canEditConfirmedOrders;

  document.getElementById("modal-empleado-titulo").textContent = "Editar empleado";
  document.getElementById("grupo-password-nuevo").hidden = true;
  document.getElementById("e-password").required = false;
  modalEmpleado.show();
}

async function guardarEmpleado(e) {
  e.preventDefault();
  const id = document.getElementById("e-id").value;

  const permissions = {
    canManageProducts: document.getElementById("e-perm-productos").checked,
    canManageInventory: document.getElementById("e-perm-inventario").checked,
    canManageOrders: document.getElementById("e-perm-pedidos").checked,
    canRegisterSales: document.getElementById("e-perm-ventas").checked,
    canViewCustomers: document.getElementById("e-perm-clientes").checked,
    canEditConfirmedOrders: document.getElementById("e-perm-editar-confirmados").checked,
  };

  try {
    if (id) {
      await apiFetch(`/admin/empleados/${id}`, {
        method: "PUT",
        body: {
          firstName: document.getElementById("e-nombre").value.trim(),
          lastName: document.getElementById("e-apellidos").value.trim(),
          phone: document.getElementById("e-celular").value.trim(),
          permissions,
        },
      });
    } else {
      await apiFetch("/admin/empleados", {
        method: "POST",
        body: {
          firstName: document.getElementById("e-nombre").value.trim(),
          lastName: document.getElementById("e-apellidos").value.trim(),
          email: document.getElementById("e-email").value.trim(),
          phone: document.getElementById("e-celular").value.trim(),
          password: document.getElementById("e-password").value,
          permissions,
        },
      });
    }
    modalEmpleado.hide();
    cargarEmpleados();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleEmpleadoActivo(id, nuevoEstado) {
  try {
    await apiFetch(`/admin/empleados/${id}`, { method: "PUT", body: { isActive: nuevoEstado } });
    cargarEmpleados();
  } catch (err) {
    alert(err.message);
  }
}
