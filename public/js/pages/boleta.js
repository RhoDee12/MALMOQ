// ============================================================================
// boleta.js - vista imprimible de un comprobante (boleta.html)
// ============================================================================
// Sirve tanto para un PEDIDO online (?tipo=pedido&id=) como para una VENTA
// presencial del POS (?tipo=venta&id=). El comprobante (numero, RUC, nombre
// del cliente) ya viene generado desde que se creo el pedido/venta (ver
// src/services/receipt.service.js) - esta pagina solo lo pinta en un
// formato imprimible (boton "Imprimir" usa window.print() del navegador,
// que el usuario puede guardar como PDF sin necesidad de una libreria aparte).
// ============================================================================

document.addEventListener("DOMContentLoaded", cargarBoleta);

async function cargarBoleta() {
  const cont = document.getElementById("contenido-boleta");
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo"); // "pedido" | "venta"
  const id = params.get("id");

  if (!id || (tipo !== "pedido" && tipo !== "venta")) {
    cont.innerHTML = `<p class="text-danger text-center py-5">Comprobante no especificado.</p>`;
    return;
  }

  try {
    const [{ settings }, detalle] = await Promise.all([
      apiFetch("/configuracion"),
      tipo === "pedido" ? apiFetch(`/pedidos/${id}`).then((r) => r.order) : apiFetch(`/admin/ventas/${id}`).then((r) => r.sale),
    ]);

    if (!detalle.receipt) {
      cont.innerHTML = `<p class="text-danger text-center py-5">Este ${tipo} todavia no tiene un comprobante generado.</p>`;
      return;
    }

    document.title = `${detalle.receipt.fullNumber} - MALMOQ`;
    cont.innerHTML = renderBoleta(detalle, settings);
    document.getElementById("btn-imprimir").hidden = false;
  } catch (err) {
    cont.innerHTML = `<p class="text-danger text-center py-5">${escapeHtml(err.message)}</p>`;
  }
}

const NOMBRES_MEDIO_PAGO = { EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin", TARJETA_POCKET_POS: "Tarjeta (Pocket POS)" };

function renderBoleta(detalle, settings) {
  const r = detalle.receipt;

  // El precio que el jefe pone en Productos (p.ej S/32) es el precio REAL
  // que paga el cliente, con IGV incluido - eso nunca cambia, ni aca ni en
  // ningun otro lado del sistema (carrito, POS, totales). Lo UNICO que
  // hace esta boleta es, solo para mostrarlo en el papel (formato SUNAT
  // estandar), partir ese precio en sus dos componentes por linea:
  //   Valor unit. (sin IGV) = precio real / 1.18   <- "baja" respecto al precio de venta
  //   IGV                    = lo que le falta para llegar al precio real
  // Subtotal sigue siendo quantity x precio real (con IGV) - lo que
  // efectivamente se cobro por esa linea, eso s/ NUNCA se reduce.
  const igvFactor = 1 + detalle.igvPercent / 100;
  const filas = detalle.items.map((i) => {
    const valorUnitario = i.unitPrice / igvFactor;
    const igvLinea = i.subtotal - i.subtotal / igvFactor;
    return `
    <tr>
      <td>
        ${escapeHtml(i.product.name)}
        ${i.saleType === "CAJA" ? `<br><small class="text-secondary">Caja x${i.boxUnits}</small>` : ""}
      </td>
      <td class="text-center">${i.quantity}</td>
      <td class="text-end">S/ ${valorUnitario.toFixed(2)}</td>
      <td class="text-end">S/ ${igvLinea.toFixed(2)}</td>
      <td class="text-end">S/ ${i.subtotal.toFixed(2)}</td>
    </tr>
  `;
  }).join("");

  const deliveryRow = detalle.deliveryCost > 0
    ? `<tr><td class="text-secondary">Delivery</td><td class="text-end">S/ ${detalle.deliveryCost.toFixed(2)}</td></tr>` : "";
  // Se muestra el precio de lista (antes de descuento) SOLO si hubo
  // descuento - si no, mostrarlo por separado es informacion redundante
  // que confunde (ver seccion siguiente: "Op. gravada" ya es el numero
  // relevante, sea o no que hubo descuento).
  const subtotalRow = detalle.discountTotal > 0
    ? `<tr><td class="text-secondary">Precio de lista</td><td class="text-end">S/ ${detalle.subtotal.toFixed(2)}</td></tr>` : "";
  const descuentoRow = detalle.discountTotal > 0
    ? `<tr><td class="text-secondary">Descuento</td><td class="text-end">- S/ ${detalle.discountTotal.toFixed(2)}</td></tr>` : "";
  const comisionRow = detalle.commissionAmount > 0
    ? `<tr><td class="text-secondary">Comision (${detalle.commissionPercent}%)</td><td class="text-end">S/ ${detalle.commissionAmount.toFixed(2)}</td></tr>` : "";
  // "Op. gravada" (o "valor de venta"): la base SIN IGV. El IGV va "por
  // dentro" del precio que ve el cliente (asi debe mostrarse siempre el
  // precio al consumidor en Peru), asi que Op.gravada + IGV = lo que ya
  // pagaria el cliente por los productos (antes de comision/delivery).
  // Mostrar esto en vez de repetir "Subtotal = Total" evita la confusion
  // de que pareciera que el IGV no se sumo a nada.
  const opGravada = detalle.taxableBase - detalle.igvAmount;

  return `
    <div class="text-center mb-3">
      ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height:60px;" class="mb-2"><br>` : ""}
      <h4 class="font-black mb-0">${escapeHtml(r.companyName)}</h4>
      ${settings.companyLegalName ? `<div class="small text-secondary">${escapeHtml(settings.companyLegalName)}</div>` : ""}
      ${r.companyRuc ? `<div class="small text-secondary">RUC: ${escapeHtml(r.companyRuc)}</div>` : ""}
      ${settings.companyAddress ? `<div class="small text-secondary">${escapeHtml(settings.companyAddress)}</div>` : ""}
    </div>
    <hr>
    <div class="d-flex justify-content-between mb-3">
      <div>
        <div class="small text-secondary">Comprobante</div>
        <strong>${escapeHtml(r.fullNumber)}</strong>
      </div>
      <div class="text-end">
        <div class="small text-secondary">Fecha</div>
        <strong>${new Date(detalle.createdAt).toLocaleString("es-PE")}</strong>
      </div>
    </div>
    <div class="mb-3">
      <div class="small text-secondary">Cliente</div>
      <strong>${escapeHtml(r.customerName)}</strong>
      ${r.customerDoc ? ` &middot; Doc: ${escapeHtml(r.customerDoc)}` : ""}
    </div>

    <table class="table table-sm boleta-items">
      <thead>
        <tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-end">Valor unit.<br><small class="fw-normal text-secondary">(sin IGV)</small></th><th class="text-end">IGV</th><th class="text-end">Subtotal</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>

    <table class="w-100 boleta-totales">
      ${subtotalRow}
      ${descuentoRow}
      <tr><td class="text-secondary">Op. gravada (valor de venta)</td><td class="text-end">S/ ${opGravada.toFixed(2)}</td></tr>
      <tr><td class="text-secondary">IGV (${detalle.igvPercent}%)</td><td class="text-end">S/ ${detalle.igvAmount.toFixed(2)}</td></tr>
      ${comisionRow}
      ${deliveryRow}
      <tr class="fs-5 fw-bold border-top"><td class="pt-2">Total</td><td class="text-end pt-2">S/ ${detalle.total.toFixed(2)}</td></tr>
    </table>
    <p class="small text-secondary mt-1 mb-0">Los precios ya incluyen IGV - el cliente paga exactamente el Total de arriba.</p>

    <p class="small text-secondary mt-3 mb-0">Medio de pago: ${NOMBRES_MEDIO_PAGO[detalle.paymentMethod?.type] || detalle.paymentMethod?.type || "-"}</p>
  `;
}
