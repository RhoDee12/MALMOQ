// ============================================================================
// CONTROLADOR DE CONTENIDO ADMINISTRABLE: PROMOCIONES, BANNERS Y ZONAS DE DELIVERY
// ============================================================================
// Estos tres modelos son simples (CRUD directo) y los administra el JEFE
// desde el modulo "Personalizar MALMOQ". Se agrupan en un solo archivo por
// ser pequenos y muy parecidos entre si.
// ============================================================================

const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { buildPublicUrl } = require("../middleware/upload.middleware");

// ---------------------------------------------------------------- PROMOCIONES

async function listPromotionsPublic(req, res) {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  // Filtra las que ya vencieron (endDate en el pasado), en memoria por simplicidad.
  res.json({ ok: true, promotions: promotions.filter((p) => !p.endDate || p.endDate >= now) });
}

async function listPromotionsAdmin(req, res) {
  const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ ok: true, promotions });
}

async function createPromotion(req, res) {
  const { title, description, startDate, endDate } = req.body;
  if (!title) throw new AppError("El titulo de la promocion es obligatorio.");
  const imageUrl = req.file ? buildPublicUrl("promociones", req.file.filename) : null;

  const promotion = await prisma.promotion.create({
    data: {
      title, description: description || null, imageUrl,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  res.status(201).json({ ok: true, promotion });
}

async function updatePromotion(req, res) {
  const id = Number(req.params.id);
  const { title, description, startDate, endDate, isActive } = req.body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (req.file) data.imageUrl = buildPublicUrl("promociones", req.file.filename);

  const promotion = await prisma.promotion.update({ where: { id }, data });
  res.json({ ok: true, promotion });
}

async function deletePromotion(req, res) {
  await prisma.promotion.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}

// -------------------------------------------------------------------- BANNERS

async function listBannersPublic(req, res) {
  const banners = await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  res.json({ ok: true, banners });
}

async function listBannersAdmin(req, res) {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ ok: true, banners });
}

async function createBanner(req, res) {
  if (!req.file) throw new AppError("Debes subir una imagen para el banner.");
  const banner = await prisma.banner.create({
    data: {
      imageUrl: buildPublicUrl("banners", req.file.filename),
      title: req.body.title || null,
      linkUrl: req.body.linkUrl || null,
      sortOrder: Number(req.body.sortOrder) || 0,
    },
  });
  res.status(201).json({ ok: true, banner });
}

async function updateBanner(req, res) {
  const id = Number(req.params.id);
  const data = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.linkUrl !== undefined) data.linkUrl = req.body.linkUrl;
  if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder);
  if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
  if (req.file) data.imageUrl = buildPublicUrl("banners", req.file.filename);

  const banner = await prisma.banner.update({ where: { id }, data });
  res.json({ ok: true, banner });
}

async function deleteBanner(req, res) {
  await prisma.banner.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}

// --------------------------------------------------------------- ZONAS DE DELIVERY

async function listDeliveryZonesPublic(req, res) {
  const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
  res.json({ ok: true, zones });
}

async function listDeliveryZonesAdmin(req, res) {
  const zones = await prisma.deliveryZone.findMany();
  res.json({ ok: true, zones });
}

async function createDeliveryZone(req, res) {
  const { name, cost, isFree } = req.body;
  if (!name) throw new AppError("El nombre de la zona es obligatorio.");
  const zone = await prisma.deliveryZone.create({ data: { name, cost: Number(cost) || 0, isFree: Boolean(isFree) } });
  res.status(201).json({ ok: true, zone });
}

async function updateDeliveryZone(req, res) {
  const id = Number(req.params.id);
  const { name, cost, isFree, isActive } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (cost !== undefined) data.cost = Number(cost);
  if (isFree !== undefined) data.isFree = Boolean(isFree);
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  const zone = await prisma.deliveryZone.update({ where: { id }, data });
  res.json({ ok: true, zone });
}

async function deleteDeliveryZone(req, res) {
  await prisma.deliveryZone.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}

module.exports = {
  listPromotionsPublic, listPromotionsAdmin, createPromotion, updatePromotion, deletePromotion,
  listBannersPublic, listBannersAdmin, createBanner, updateBanner, deleteBanner,
  listDeliveryZonesPublic, listDeliveryZonesAdmin, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
};
