// ============================================================================
// carrito.js - logica de la pagina del carrito (carrito.html)
// ============================================================================
// Muestra los items guardados en localStorage y, ademas, consulta al
// backend si la cantidad seleccionada de cada producto SIGUE disponible
// (aviso temprano - la verificacion definitiva es en el checkout/backend).
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  renderCarrito();
  verificarDisponibilidad();

  document.getElementById("btn-vaciar-carrito")?.addEventListener("click", () => {
    if (confirm("Deseas vaciar todo el carrito?")) {
      cartClear();
      renderCarrito();
    }
  });
});

function renderCarrito() {
  const items = cartGetItems();
  document.getElementById("carrito-vacio").hidden = items.length > 0;
  document.getElementById("carrito-contenido").hidden = items.length === 0;
  if (items.length === 0) return;

  document.getElementById("carrito-items").innerHTML = items.map((item) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${item.imageUrl || "/img/placeholder-producto.svg"}" class="carrito-item">
          <span>${escapeHtml(item.name)} ${item.saleType === "CAJA" ? `<span class="badge bg-secondary">caja x${item.unitsPerBox}</span>` : ""}</span>
        </div>
      </td>
      <td>S/ ${item.unitPrice.toFixed(2)}</td>
      <td style="max-width:110px;">
        <input type="number" min="1" value="${item.quantity}" class="form-control form-control-sm input-cantidad-carrito" data-id="${item.productId}" data-tipo="${item.saleType || "UNIDAD"}">
      </td>
      <td>S/ ${(item.unitPrice * item.quantity).toFixed(2)}</td>
      <td><button class="btn btn-sm btn-outline-danger btn-quitar-item" data-id="${item.productId}" data-tipo="${item.saleType || "UNIDAD"}">&times;</button></td>
    </tr>
  `).join("");

  document.getElementById("carrito-total").textContent = `S/ ${cartTotal().toFixed(2)}`;

  document.querySelectorAll(".input-cantidad-carrito").forEach((input) => {
    input.addEventListener("change", () => {
      cartSetQuantity(Number(input.dataset.id), Math.max(1, Number(input.value) || 1), input.dataset.tipo);
      renderCarrito();
      verificarDisponibilidad();
    });
  });
  document.querySelectorAll(".btn-quitar-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      cartRemoveItem(Number(btn.dataset.id), btn.dataset.tipo);
      renderCarrito();
    });
  });
}

/** Consulta al backend si el carrito sigue teniendo stock disponible. */
async function verificarDisponibilidad() {
  const items = cartGetItems();
  const alerta = document.getElementById("alerta-stock");
  if (items.length === 0) { alerta.hidden = true; return; }

  try {
    const { disponible, problemas } = await apiFetch("/carrito/verificar", {
      method: "POST",
      body: { items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, saleType: i.saleType || "UNIDAD" })) },
    });

    if (!disponible) {
      alerta.hidden = false;
      alerta.innerHTML = "Lo sentimos, la cantidad seleccionada ya no esta disponible para: <br>" +
        problemas.map((p) => `- <strong>${escapeHtml(p.name)}</strong>: pediste ${p.requested}, quedan ${p.available}.`).join("<br>");
    } else {
      alerta.hidden = true;
    }
  } catch (err) {
    console.error("No se pudo verificar el stock:", err);
  }
}
