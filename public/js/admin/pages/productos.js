// ============================================================================
// productos.js - CRUD de productos en el panel (admin/productos.html)
// ============================================================================

let productosCache = [];
let categoriasCache = [];
let modalProducto = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage();
  if (!user) return;

  modalProducto = new bootstrap.Modal(document.getElementById("modal-producto"));
  await cargarCategoriasYMarcas();
  await cargarProductos();

  document.getElementById("form-producto").addEventListener("submit", guardarProducto);
  document.getElementById("buscar-producto").addEventListener("input", (e) => renderTabla(filtrarProductos(e.target.value)));
});

async function cargarCategoriasYMarcas() {
  const [{ categories }, { brands }] = await Promise.all([apiFetch("/admin/categorias"), apiFetch("/marcas")]);
  categoriasCache = categories;
  const selCat = document.getElementById("p-categoria");
  selCat.innerHTML = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  const selMarca = document.getElementById("p-marca");
  brands.forEach((b) => selMarca.insertAdjacentHTML("beforeend", `<option value="${b.id}">${b.name}</option>`));
}

async function cargarProductos() {
  const { products } = await apiFetch("/admin/productos");
  productosCache = products;
  renderTabla(products);
}

function filtrarProductos(texto) {
  const t = texto.trim().toLowerCase();
  if (!t) return productosCache;
  return productosCache.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t));
}

function renderTabla(products) {
  const tbody = document.getElementById("tabla-productos");
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay productos.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p) => `
    <tr>
      <td><img src="${p.imageUrl || "/img/placeholder-producto.svg"}" class="thumb-admin"></td>
      <td>${escapeHtml(p.sku)}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category?.name || "-")}</td>
      <td>S/ ${p.price.toFixed(2)}</td>
      <td>${p.stock} ${p.stock <= p.minStock ? '<span class="badge bg-warning text-dark">bajo</span>' : ""}</td>
      <td>${p.isActive ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalEditarProducto(${p.id})">Editar</button>
        ${p.isActive ? `<button class="btn btn-sm btn-outline-danger" onclick="desactivarProducto(${p.id})">Desactivar</button>` : ""}
      </td>
    </tr>
  `).join("");
}

function abrirModalNuevoProducto() {
  document.getElementById("form-producto").reset();
  document.getElementById("p-id").value = "";
  document.getElementById("modal-producto-titulo").textContent = "Nuevo producto";
  document.getElementById("grupo-stock-inicial").hidden = false;
}

function abrirModalEditarProducto(id) {
  const p = productosCache.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("p-id").value = p.id;
  document.getElementById("p-sku").value = p.sku;
  document.getElementById("p-nombre").value = p.name;
  document.getElementById("p-categoria").value = p.categoryId;
  document.getElementById("p-marca").value = p.brandId || "";
  document.getElementById("p-presentacion").value = p.presentation || "";
  document.getElementById("p-descripcion").value = p.description || "";
  document.getElementById("p-precio").value = p.price;
  document.getElementById("p-precio-promo").value = p.promoPrice || "";
  document.getElementById("p-descuento").value = p.discountPercent || "";
  document.getElementById("p-stock-minimo").value = p.minStock;
  document.getElementById("modal-producto-titulo").textContent = "Editar producto";
  // El stock NO se edita aca (usar el modulo de Inventario, para que quede auditado).
  document.getElementById("grupo-stock-inicial").hidden = true;
  modalProducto.show();
}

async function guardarProducto(e) {
  e.preventDefault();
  const id = document.getElementById("p-id").value;

  const body = {
    sku: document.getElementById("p-sku").value.trim(),
    name: document.getElementById("p-nombre").value.trim(),
    categoryId: Number(document.getElementById("p-categoria").value),
    brandId: document.getElementById("p-marca").value || null,
    presentation: document.getElementById("p-presentacion").value.trim(),
    description: document.getElementById("p-descripcion").value.trim(),
    price: Number(document.getElementById("p-precio").value),
    promoPrice: document.getElementById("p-precio-promo").value || "",
    discountPercent: document.getElementById("p-descuento").value || "",
    minStock: Number(document.getElementById("p-stock-minimo").value),
  };
  if (!id) body.stock = Number(document.getElementById("p-stock").value) || 0;

  try {
    let productId = id;
    if (id) {
      await apiFetch(`/admin/productos/${id}`, { method: "PUT", body });
    } else {
      const { product } = await apiFetch("/admin/productos", { method: "POST", body });
      productId = product.id;
    }

    const file = document.getElementById("p-imagen").files[0];
    if (file) {
      const formData = new FormData();
      formData.append("imagen", file);
      await apiUpload(`/admin/productos/${productId}/imagen`, formData);
    }

    modalProducto.hide();
    await cargarProductos();
  } catch (err) {
    alert(err.message);
  }
}

async function desactivarProducto(id) {
  if (!confirm("Desactivar este producto? Ya no se vera en la tienda, pero se conserva su historial.")) return;
  try {
    await apiFetch(`/admin/productos/${id}`, { method: "DELETE" });
    await cargarProductos();
  } catch (err) {
    alert(err.message);
  }
}
