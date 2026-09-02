// ============================================================================
// CONTROLADOR DE CONFIGURACION GENERAL
// ============================================================================
// Agrupa todo lo que el JEFE personaliza sin tocar codigo: datos del Home,
// IGV, RUC, WhatsApp, medios de pago (Yape/Plin/Tarjeta) y el % de
// comision del Pocket POS (con historial de vigencia, ver PaymentCommission).
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { PAYMENT_METHOD_TYPES } = require("../constants");
const { logActivity } = require("../services/activityLog.service");

/** GET /api/configuracion - publica (el frontend la usa para el Home, WhatsApp, etc). */
async function getPublicSettings(req, res) {
  const settings = await ensureSettingsRow();
  // No se exponen datos internos innecesarios; por ahora se manda todo, es
  // informacion de la propia tienda (no hay secretos aca).
  res.json({ ok: true, settings });
}

/** GET /api/admin/configuracion - misma info, para el panel administrativo. */
async function getAdminSettings(req, res) {
  const settings = await ensureSettingsRow();
  res.json({ ok: true, settings });
}

async function ensureSettingsRow() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: { id: 1 } });
}

/**
 * PUT /api/admin/configuracion
 * Solo JEFE. Actualiza cualquier subconjunto de los campos de SiteSettings
 * (Home, IGV, datos de la empresa, delivery, WhatsApp).
 */
async function updateSettings(req, res) {
  await ensureSettingsRow();
  const allowedFields = [
    "heroTitle", "heroSubtitle",
    "igvPercent", "pricesIncludeIgv", "companyRuc", "companyName", "companyLegalName", "companyAddress",
    "deliveryMinOrder", "whatsappNumber", "whatsappMessage",
  ];
  const data = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (data.igvPercent !== undefined) data.igvPercent = Number(data.igvPercent);
  if (data.deliveryMinOrder !== undefined) data.deliveryMinOrder = Number(data.deliveryMinOrder);
  if (data.pricesIncludeIgv !== undefined) data.pricesIncludeIgv = Boolean(data.pricesIncludeIgv);

  const settings = await prisma.siteSettings.update({ where: { id: 1 }, data });
  await logActivity({ userId: req.user.id, action: "SETTINGS_UPDATE", entity: "SiteSettings", newValue: data });
  res.json({ ok: true, settings });
}

/** Sube el logo, favicon o imagen del hero. campo esperado en la ruta ("logo" | "favicon" | "hero"). */
async function uploadBrandImage(req, res) {
  const { buildPublicUrl } = require("../middleware/upload.middleware");
  const target = req.params.target; // "logo" | "favicon" | "hero"
  const fieldMap = { logo: "logoUrl", favicon: "faviconUrl", hero: "heroImageUrl" };
  if (!fieldMap[target]) throw new AppError("Destino de imagen invalido.");
  if (!req.file) throw new AppError("No se recibio ninguna imagen.");

  await ensureSettingsRow();
  const url = buildPublicUrl("marca", req.file.filename);
  const settings = await prisma.siteSettings.update({ where: { id: 1 }, data: { [fieldMap[target]]: url } });
  res.json({ ok: true, settings });
}

// ----------------------------------------------------------------------------
// MEDIOS DE PAGO
// ----------------------------------------------------------------------------

/** GET /api/medios-pago - lista publica de medios de pago activos (para el checkout). */
async function listPublicPaymentMethods(req, res) {
  const methods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  // No se expone info sensible (no hay ninguna en este modelo, son datos de cobro publicos: Yape/Plin/numero).
  res.json({ ok: true, methods });
}

/** GET /api/admin/medios-pago - lista completa para el panel (incluye inactivos). */
async function listAdminPaymentMethods(req, res) {
  const methods = await prisma.paymentMethod.findMany({ include: { commissions: { orderBy: { validFrom: "desc" } } } });
  res.json({ ok: true, methods });
}

/**
 * PUT /api/admin/medios-pago/:type
 * Activa/desactiva y configura un medio de pago (numero, titular). El
 * "type" es uno de EFECTIVO | YAPE | PLIN | TARJETA_POCKET_POS. Si no
 * existe todavia una fila para ese tipo, se crea (upsert).
 */
async function upsertPaymentMethod(req, res) {
  const type = req.params.type;
  if (!Object.values(PAYMENT_METHOD_TYPES).includes(type)) throw new AppError("Medio de pago invalido.");

  const { isActive, phoneNumber, accountHolder } = req.body;
  const data = {};
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
  if (accountHolder !== undefined) data.accountHolder = accountHolder;

  const method = await prisma.paymentMethod.upsert({
    where: { type },
    update: data,
    create: { type, isActive: isActive !== undefined ? Boolean(isActive) : true, phoneNumber, accountHolder },
  });

  await logActivity({ userId: req.user.id, action: "PAYMENT_METHOD_UPDATE", entity: "PaymentMethod", entityId: method.id, newValue: data });
  res.json({ ok: true, method });
}

/** Sube el QR de Yape o Plin. */
async function uploadPaymentQr(req, res) {
  const type = req.params.type;
  if (!Object.values(PAYMENT_METHOD_TYPES).includes(type)) throw new AppError("Medio de pago invalido.");
  if (!req.file) throw new AppError("No se recibio ninguna imagen.");

  const { buildPublicUrl } = require("../middleware/upload.middleware");
  const qrImageUrl = buildPublicUrl("qr", req.file.filename);

  const method = await prisma.paymentMethod.upsert({
    where: { type },
    update: { qrImageUrl },
    create: { type, qrImageUrl },
  });
  res.json({ ok: true, method });
}

/**
 * POST /api/admin/medios-pago/pocket-pos/comision
 * Crea una NUEVA comision vigente para el Pocket POS (nunca se edita una
 * pasada). Automaticamente cierra la vigencia de la comision anterior
 * (le pone validTo = ahora) para que no queden dos "activas" a la vez.
 * Ver seccion 17-18 del brief: esto es lo que garantiza que ventas viejas
 * conserven el % que se uso en su momento.
 */
async function createPocketPosCommission(req, res) {
  const { percent, providerName } = req.body;
  if (percent == null || Number(percent) < 0) throw new AppError("Porcentaje de comision invalido.");

  const method = await prisma.paymentMethod.upsert({
    where: { type: PAYMENT_METHOD_TYPES.TARJETA_POCKET_POS },
    update: {},
    create: { type: PAYMENT_METHOD_TYPES.TARJETA_POCKET_POS },
  });

  const now = new Date();
  const commission = await prisma.$transaction(async (tx) => {
    await tx.paymentCommission.updateMany({
      where: { paymentMethodId: method.id, validTo: null },
      data: { validTo: now },
    });
    return tx.paymentCommission.create({
      data: { paymentMethodId: method.id, percent: Number(percent), providerName: providerName || null, validFrom: now },
    });
  });

  await logActivity({ userId: req.user.id, action: "POCKET_POS_COMMISSION_UPDATE", entity: "PaymentCommission", entityId: commission.id, newValue: commission });
  res.status(201).json({ ok: true, commission });
}

module.exports = {
  getPublicSettings, getAdminSettings, updateSettings, uploadBrandImage,
  listPublicPaymentMethods, listAdminPaymentMethods, upsertPaymentMethod, uploadPaymentQr,
  createPocketPosCommission,
};
