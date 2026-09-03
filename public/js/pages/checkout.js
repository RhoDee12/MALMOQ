// ============================================================================
// checkout.js - logica de la pagina de pago (checkout.html)
// ============================================================================
// Flujo: 1) el cliente completa entrega + medio de pago -> se crea el
// pedido real en el backend (que verifica stock, calcula IGV/comision y
// descuenta inventario). 2) Si el medio elegido es Yape o Plin, se pide
// adjuntar el comprobante. 3) Se muestra la confirmacion final.
// ============================================================================

let mediosPago = [];
let zonasDelivery = [];
let pedidoCreadoId = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (cartGetItems().length === 0) {
    window.location.href = "/carrito.html";
    return;
  }

  const sesionOk = await verificarSesion();
  if (!sesionOk) return;

  await Promise.all([cargarMediosPago(), cargarZonasDelivery()]);
  renderResumen();

  document.querySelectorAll('input[name="deliveryMode"]').forEach((r) =>
    r.addEventListener("change", () => {
      document.getElementById("campos-delivery").hidden = document.getElementById("modo-delivery").checked === false;
      renderResumen();
    })
  );
  document.getElementById("input-zona").addEventListener("change", renderResumen);

  document.getElementById("form-checkout").addEventListener("submit", confirmarPedido);
  document.getElementById("form-comprobante").addEventListener("submit", enviarComprobante);
});

/** Redirige a login si no hay sesion iniciada; devuelve true si si la hay. */
async function verificarSesion() {
  try {
    await apiFetch("/auth/me");
    return true;
  } catch {
    document.getElementById("checkout-necesita-login").hidden = false;
    document.getElementById("form-checkout").hidden = true;
    return false;
  }
}

async function cargarMediosPago() {
  const { methods } = await apiFetch("/medios-pago");
  mediosPago = methods;
  const cont = document.getElementById("medios-pago-opciones");
  const nombres = { EFECTIVO: "Efectivo (al recibir/recoger)", YAPE: "Yape", PLIN: "Plin", TARJETA_POCKET_POS: "Tarjeta (Pocket POS)" };

  cont.innerHTML = methods.map((m, i) => `
    <div class="form-check">
      <input class="form-check-input" type="radio" name="paymentMethod" id="medio-${m.type}" value="${m.id}" data-tipo="${m.type}" ${i === 0 ? "checked" : ""}>
      <label class="form-check-label" for="medio-${m.type}">${nombres[m.type] || m.type}</label>
    </div>
  `).join("") || `<p class="text-muted small">No hay medios de pago disponibles por el momento.</p>`;

  document.querySelectorAll('input[name="paymentMethod"]').forEach((r) => r.addEventListener("change", mostrarInfoMedioPago));
  mostrarInfoMedioPago();
}

function mostrarInfoMedioPago() {
  const seleccionado = document.querySelector('input[name="paymentMethod"]:checked');
  const info = document.getElementById("medio-pago-info");
  if (!seleccionado) { info.innerHTML = ""; return; }

  const metodo = mediosPago.find((m) => m.id === Number(seleccionado.value));
  if (!metodo) { info.innerHTML = ""; return; }

  if (metodo.type === "YAPE" || metodo.type === "PLIN") {
    info.innerHTML = `
      <div class="small border rounded p-2">
        ${metodo.phoneNumber ? `<p class="mb-1">Numero: <strong>${metodo.phoneNumber}</strong></p>` : ""}
        ${metodo.accountHolder ? `<p class="mb-1">Titular: <strong>${metodo.accountHolder}</strong></p>` : ""}
        ${metodo.qrImageUrl ? `<img src="${metodo.qrImageUrl}" style="max-width:140px;">` : ""}
        <p class="mb-0 text-secondary">Luego de confirmar el pedido, podras adjuntar tu comprobante de pago.</p>
      </div>`;
  } else if (metodo.type === "TARJETA_POCKET_POS") {
    info.innerHTML = `<p class="small text-secondary">Se cobrara con nuestro Pocket POS al momento de la entrega/recojo. Puede incluir una comision adicional.</p>`;
  } else {
    info.innerHTML = `<p class="small text-secondary">Pagas en efectivo al recibir tu pedido.</p>`;
  }
}

async function cargarZonasDelivery() {
  const { zones } = await apiFetch("/zonas-delivery");
  zonasDelivery = zones;
  const sel = document.getElementById("input-zona");
  sel.innerHTML = zones.map((z) => `<option value="${z.id}" data-costo="${z.isFree ? 0 : z.cost}">${z.name} - ${z.isFree ? "Gratis" : "S/ " + z.cost.toFixed(2)}</option>`).join("")
    || `<option value="">Sin zonas configuradas</option>`;
}

function renderResumen() {
  const items = cartGetItems();
  document.getElementById("resumen-items").innerHTML = items.map((i) => `
    <div class="d-flex justify-content-between">
      <span>${i.quantity} x ${escapeHtml(i.name)} ${i.saleType === "CAJA" ? `<small class="text-secondary">(caja x${i.unitsPerBox})</small>` : ""}</span>
      <span>S/ ${(i.unitPrice * i.quantity).toFixed(2)}</span>
    </div>`).join("");

  const subtotal = cartTotal();
  let delivery = 0;
  if (document.getElementById("modo-delivery")?.checked) {
    const opt = document.getElementById("input-zona").selectedOptions[0];
    delivery = opt ? Number(opt.dataset.costo) || 0 : 0;
  }

  document.getElementById("resumen-subtotal").textContent = `S/ ${subtotal.toFixed(2)}`;
  document.getElementById("resumen-delivery").textContent = `S/ ${delivery.toFixed(2)}`;
  document.getElementById("resumen-total").textContent = `S/ ${(subtotal + delivery).toFixed(2)} *`;
}

async function confirmarPedido(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-confirmar-pedido");
  btn.disabled = true;
  btn.textContent = "Procesando...";

  try {
    const deliveryMode = document.querySelector('input[name="deliveryMode"]:checked').value;
    const paymentMethodId = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethodId) throw new Error("Debes elegir un medio de pago.");

    const body = {
      items: cartGetItems().map((i) => ({ productId: i.productId, quantity: i.quantity, saleType: i.saleType || "UNIDAD" })),
      deliveryMode,
      paymentMethodId: Number(paymentMethodId),
    };
    if (deliveryMode === "DELIVERY") {
      body.address = document.getElementById("input-direccion").value.trim();
      body.reference = document.getElementById("input-referencia").value.trim();
      body.deliveryZoneId = document.getElementById("input-zona").value ? Number(document.getElementById("input-zona").value) : undefined;
      if (!body.address) throw new Error("Ingresa la direccion de entrega.");
    }

    const { order } = await apiFetch("/pedidos", { method: "POST", body });
    pedidoCreadoId = order.id;
    cartClear();

    const linkComprobante = document.getElementById("link-ver-comprobante");
    linkComprobante.href = `/boleta.html?tipo=pedido&id=${order.id}`;
    linkComprobante.hidden = false;

    const tipoMedio = mediosPago.find((m) => m.id === Number(paymentMethodId))?.type;
    document.getElementById("form-checkout").hidden = true;

    if (tipoMedio === "YAPE" || tipoMedio === "PLIN") {
      document.getElementById("numero-pedido-creado").textContent = order.orderNumber;
      document.getElementById("paso-comprobante").hidden = false;
    } else {
      document.getElementById("paso-final").hidden = false;
    }
  } catch (err) {
    mostrarToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar pedido";
  }
}

async function enviarComprobante(e) {
  e.preventDefault();
  try {
    const formData = new FormData();
    formData.append("operationNumber", document.getElementById("input-num-operacion").value.trim());
    const file = document.getElementById("input-comprobante").files[0];
    if (file) formData.append("comprobante", file);

    await apiUpload(`/pedidos/${pedidoCreadoId}/pago`, formData);
    document.getElementById("paso-comprobante").hidden = true;
    document.getElementById("paso-final").hidden = false;
  } catch (err) {
    mostrarToast(err.message, true);
  }
}
