// ============================================================================
// configuracion.js - "Personalizar MALMOQ" (admin/configuracion.html, solo JEFE)
// ============================================================================
// Agrupa TODO lo que el jefe puede cambiar sin tocar codigo: contenido del
// Home, logo/favicon/hero, IGV y datos de la empresa, medios de pago
// (Yape/Plin/Pocket POS con su comision) y zonas de delivery.
// ============================================================================

const NOMBRES_MEDIO = { EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin", TARJETA_POCKET_POS: "Tarjeta / Pocket POS" };

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initAdminPage({ jefeOnly: true });
  if (!user) return;

  await cargarConfiguracionGeneral();
  await cargarMediosPagoConfig();
  await cargarZonas();

  document.getElementById("form-general").addEventListener("submit", guardarGeneral);
  document.getElementById("form-tributario").addEventListener("submit", guardarTributario);
  document.getElementById("form-comision").addEventListener("submit", actualizarComision);
  document.getElementById("form-zona").addEventListener("submit", crearZona);
  document.getElementById("form-delivery-min").addEventListener("submit", guardarDeliveryMinimo);
});

// ------------------------------------------------------------ GENERAL/IMAGENES

async function cargarConfiguracionGeneral() {
  const { settings } = await apiFetch("/admin/configuracion");

  document.getElementById("cfg-hero-titulo").value = settings.heroTitle || "";
  document.getElementById("cfg-hero-subtitulo").value = settings.heroSubtitle || "";
  document.getElementById("cfg-whatsapp-numero").value = settings.whatsappNumber || "";
  document.getElementById("cfg-whatsapp-mensaje").value = settings.whatsappMessage || "";
  document.getElementById("cfg-nombre-comercial").value = settings.companyName || "";
  document.getElementById("cfg-direccion").value = settings.companyAddress || "";
  document.getElementById("cfg-igv").value = settings.igvPercent;
  document.getElementById("cfg-precios-incluyen-igv").checked = settings.pricesIncludeIgv;
  document.getElementById("cfg-ruc").value = settings.companyRuc || "";
  document.getElementById("cfg-razon-social").value = settings.companyLegalName || "";
  document.getElementById("cfg-delivery-min").value = settings.deliveryMinOrder;

  const placeholder = "/img/placeholder-producto.svg";
  document.getElementById("preview-logo").src = settings.logoUrl || placeholder;
  document.getElementById("preview-favicon").src = settings.faviconUrl || placeholder;
  document.getElementById("preview-hero").src = settings.heroImageUrl || placeholder;
}

async function guardarGeneral(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/configuracion", {
      method: "PUT",
      body: {
        heroTitle: document.getElementById("cfg-hero-titulo").value.trim(),
        heroSubtitle: document.getElementById("cfg-hero-subtitulo").value.trim(),
        whatsappNumber: document.getElementById("cfg-whatsapp-numero").value.trim(),
        whatsappMessage: document.getElementById("cfg-whatsapp-mensaje").value.trim(),
        companyName: document.getElementById("cfg-nombre-comercial").value.trim(),
        companyAddress: document.getElementById("cfg-direccion").value.trim(),
      },
    });
    alert("Cambios guardados.");
  } catch (err) {
    alert(err.message);
  }
}

async function subirImagenMarca(target, file) {
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append("imagen", file);
    const { settings } = await apiUpload(`/admin/configuracion/imagen/${target}`, formData);
    cargarConfiguracionGeneral();
  } catch (err) {
    alert(err.message);
  }
}

// ------------------------------------------------------------------ TRIBUTARIO

async function guardarTributario(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/configuracion", {
      method: "PUT",
      body: {
        igvPercent: document.getElementById("cfg-igv").value,
        pricesIncludeIgv: document.getElementById("cfg-precios-incluyen-igv").checked,
        companyRuc: document.getElementById("cfg-ruc").value.trim(),
        companyLegalName: document.getElementById("cfg-razon-social").value.trim(),
      },
    });
    alert("Configuracion tributaria actualizada. Se aplicara a las ventas nuevas.");
  } catch (err) {
    alert(err.message);
  }
}

// ---------------------------------------------------------------- MEDIOS DE PAGO

async function cargarMediosPagoConfig() {
  const { methods } = await apiFetch("/admin/medios-pago");
  const cont = document.getElementById("medios-pago-config");

  cont.innerHTML = methods.map((m) => {
    if (m.type === "TARJETA_POCKET_POS") return renderComisionActual(m);
    if (m.type === "EFECTIVO") return renderMedioSimple(m);
    return renderMedioYapePlin(m);
  }).join("");

  methods.forEach((m) => {
    document.getElementById(`toggle-${m.type}`)?.addEventListener("change", (e) => toggleMedioPago(m.type, e.target.checked));
    document.getElementById(`form-medio-${m.type}`)?.addEventListener("submit", (e) => guardarMedioPago(e, m.type));
    document.getElementById(`qr-medio-${m.type}`)?.addEventListener("change", (e) => subirQr(m.type, e.target.files[0]));
  });

  const pocketPos = methods.find((m) => m.type === "TARJETA_POCKET_POS");
  const comisionVigente = pocketPos?.commissions?.find((c) => !c.validTo);
  document.getElementById("comision-actual").innerHTML = comisionVigente
    ? `<p class="mb-0">Comision vigente: <strong>${comisionVigente.percent}%</strong> ${comisionVigente.providerName ? "(" + escapeHtml(comisionVigente.providerName) + ")" : ""}</p>`
    : `<p class="mb-0 text-muted">Aun no hay una comision configurada.</p>`;
}

function renderComisionActual(m) {
  return `
    <div class="admin-card">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="font-semibold mb-0">${NOMBRES_MEDIO[m.type]}</h5>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="toggle-${m.type}" ${m.isActive ? "checked" : ""}>
          <label class="form-check-label small" for="toggle-${m.type}">Activo</label>
        </div>
      </div>
      <p class="small text-secondary mb-0">La comision se configura mas abajo.</p>
    </div>
  `;
}

function renderMedioSimple(m) {
  return `
    <div class="admin-card">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="font-semibold mb-0">${NOMBRES_MEDIO[m.type]}</h5>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="toggle-${m.type}" ${m.isActive ? "checked" : ""}>
          <label class="form-check-label small" for="toggle-${m.type}">Activo</label>
        </div>
      </div>
    </div>
  `;
}

function renderMedioYapePlin(m) {
  return `
    <div class="admin-card">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="font-semibold mb-0">${NOMBRES_MEDIO[m.type]}</h5>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="toggle-${m.type}" ${m.isActive ? "checked" : ""}>
          <label class="form-check-label small" for="toggle-${m.type}">Activo</label>
        </div>
      </div>
      <form id="form-medio-${m.type}" class="row g-2 align-items-end">
        <div class="col-md-4">
          <label class="form-label small">Numero</label>
          <input type="text" class="form-control form-control-sm" id="numero-${m.type}" value="${m.phoneNumber || ""}">
        </div>
        <div class="col-md-4">
          <label class="form-label small">Titular</label>
          <input type="text" class="form-control form-control-sm" id="titular-${m.type}" value="${m.accountHolder || ""}">
        </div>
        <div class="col-md-2">
          <button type="submit" class="btn btn-admin-primary btn-sm">Guardar</button>
        </div>
      </form>
      <div class="mt-2">
        <label class="form-label small d-block">QR</label>
        ${m.qrImageUrl ? `<img src="${m.qrImageUrl}" style="max-height:80px;" class="mb-1 d-block">` : ""}
        <input type="file" accept="image/*" class="form-control form-control-sm w-auto" id="qr-medio-${m.type}">
      </div>
    </div>
  `;
}

async function toggleMedioPago(type, isActive) {
  try {
    await apiFetch(`/admin/medios-pago/${type}`, { method: "PUT", body: { isActive } });
  } catch (err) {
    alert(err.message);
  }
}

async function guardarMedioPago(e, type) {
  e.preventDefault();
  try {
    await apiFetch(`/admin/medios-pago/${type}`, {
      method: "PUT",
      body: {
        phoneNumber: document.getElementById(`numero-${type}`).value.trim(),
        accountHolder: document.getElementById(`titular-${type}`).value.trim(),
      },
    });
    alert("Datos guardados.");
  } catch (err) {
    alert(err.message);
  }
}

async function subirQr(type, file) {
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append("imagen", file);
    await apiUpload(`/admin/medios-pago/${type}/qr`, formData);
    cargarMediosPagoConfig();
  } catch (err) {
    alert(err.message);
  }
}

async function actualizarComision(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/medios-pago/pocket-pos/comision", {
      method: "POST",
      body: {
        percent: document.getElementById("cfg-comision-porcentaje").value,
        providerName: document.getElementById("cfg-comision-proveedor").value.trim(),
      },
    });
    document.getElementById("form-comision").reset();
    cargarMediosPagoConfig();
    alert("Comision actualizada. Las ventas anteriores conservan el porcentaje anterior.");
  } catch (err) {
    alert(err.message);
  }
}

// ----------------------------------------------------------------------- DELIVERY

async function cargarZonas() {
  const { zones } = await apiFetch("/admin/zonas-delivery");
  document.getElementById("tabla-zonas").innerHTML = zones.map((z) => `
    <tr>
      <td>${escapeHtml(z.name)}</td>
      <td>${z.isFree ? "Gratis" : "S/ " + z.cost.toFixed(2)}</td>
      <td>${z.isActive ? '<span class="badge bg-success">Activa</span>' : '<span class="badge bg-secondary">Inactiva</span>'}</td>
      <td><button class="btn btn-sm btn-outline-secondary" onclick="toggleZona(${z.id}, ${!z.isActive})">${z.isActive ? "Desactivar" : "Activar"}</button></td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="text-center text-muted py-3">Aun no hay zonas.</td></tr>`;
}

async function crearZona(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/zonas-delivery", {
      method: "POST",
      body: {
        name: document.getElementById("z-nombre").value.trim(),
        cost: document.getElementById("z-costo").value,
        isFree: document.getElementById("z-gratis").checked,
      },
    });
    document.getElementById("form-zona").reset();
    cargarZonas();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleZona(id, nuevoEstado) {
  try {
    await apiFetch(`/admin/zonas-delivery/${id}`, { method: "PUT", body: { isActive: nuevoEstado } });
    cargarZonas();
  } catch (err) {
    alert(err.message);
  }
}

async function guardarDeliveryMinimo(e) {
  e.preventDefault();
  try {
    await apiFetch("/admin/configuracion", { method: "PUT", body: { deliveryMinOrder: document.getElementById("cfg-delivery-min").value } });
    alert("Guardado.");
  } catch (err) {
    alert(err.message);
  }
}
