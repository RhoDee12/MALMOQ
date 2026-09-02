// Rutas de configuracion general y medios de pago.
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/settings.controller");

const uploadBrandImage = createUploader("marca");
const uploadQr = createUploader("qr");
const jefeOnly = [requireAuth, requireRole("JEFE")];

// Publicas
router.get("/configuracion", asyncHandler(ctrl.getPublicSettings));
router.get("/medios-pago", asyncHandler(ctrl.listPublicPaymentMethods));

// Administrativas (personalizacion de MALMOQ: solo el JEFE, ver seccion 28 del brief)
router.get("/admin/configuracion", ...jefeOnly, asyncHandler(ctrl.getAdminSettings));
router.put("/admin/configuracion", ...jefeOnly, asyncHandler(ctrl.updateSettings));
router.post("/admin/configuracion/imagen/:target", ...jefeOnly, uploadBrandImage.single("imagen"), asyncHandler(ctrl.uploadBrandImage));

router.get("/admin/medios-pago", ...jefeOnly, asyncHandler(ctrl.listAdminPaymentMethods));
router.put("/admin/medios-pago/:type", ...jefeOnly, asyncHandler(ctrl.upsertPaymentMethod));
router.post("/admin/medios-pago/:type/qr", ...jefeOnly, uploadQr.single("imagen"), asyncHandler(ctrl.uploadPaymentQr));
router.post("/admin/medios-pago/pocket-pos/comision", ...jefeOnly, asyncHandler(ctrl.createPocketPosCommission));

module.exports = router;
