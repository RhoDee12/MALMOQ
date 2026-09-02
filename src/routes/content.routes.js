// Rutas de contenido administrable: promociones, banners y zonas de delivery.
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/content.controller");

const uploadPromoImage = createUploader("promociones");
const uploadBannerImage = createUploader("banners");
const jefeOnly = [requireAuth, requireRole("JEFE")];

// Promociones
router.get("/promociones", asyncHandler(ctrl.listPromotionsPublic));
router.get("/admin/promociones", ...jefeOnly, asyncHandler(ctrl.listPromotionsAdmin));
router.post("/admin/promociones", ...jefeOnly, uploadPromoImage.single("imagen"), asyncHandler(ctrl.createPromotion));
router.put("/admin/promociones/:id", ...jefeOnly, uploadPromoImage.single("imagen"), asyncHandler(ctrl.updatePromotion));
router.delete("/admin/promociones/:id", ...jefeOnly, asyncHandler(ctrl.deletePromotion));

// Banners
router.get("/banners", asyncHandler(ctrl.listBannersPublic));
router.get("/admin/banners", ...jefeOnly, asyncHandler(ctrl.listBannersAdmin));
router.post("/admin/banners", ...jefeOnly, uploadBannerImage.single("imagen"), asyncHandler(ctrl.createBanner));
router.put("/admin/banners/:id", ...jefeOnly, uploadBannerImage.single("imagen"), asyncHandler(ctrl.updateBanner));
router.delete("/admin/banners/:id", ...jefeOnly, asyncHandler(ctrl.deleteBanner));

// Zonas de delivery
router.get("/zonas-delivery", asyncHandler(ctrl.listDeliveryZonesPublic));
router.get("/admin/zonas-delivery", ...jefeOnly, asyncHandler(ctrl.listDeliveryZonesAdmin));
router.post("/admin/zonas-delivery", ...jefeOnly, asyncHandler(ctrl.createDeliveryZone));
router.put("/admin/zonas-delivery/:id", ...jefeOnly, asyncHandler(ctrl.updateDeliveryZone));
router.delete("/admin/zonas-delivery/:id", ...jefeOnly, asyncHandler(ctrl.deleteDeliveryZone));

module.exports = router;
