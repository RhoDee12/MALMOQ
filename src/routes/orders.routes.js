// Rutas de pedidos: /api/pedidos/* (cliente) y /api/admin/pedidos/* (empleado/jefe)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/orders.controller");

const uploadPaymentProof = createUploader("comprobantes-pago");
const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

// Cliente
router.post("/pedidos", requireAuth, asyncHandler(ctrl.create));
router.get("/pedidos/mios", requireAuth, asyncHandler(ctrl.listMine));
router.get("/pedidos/:id", requireAuth, asyncHandler(ctrl.getById));
router.post("/pedidos/:id/pago", requireAuth, uploadPaymentProof.single("comprobante"), asyncHandler(ctrl.attachPayment));

// Empleado / jefe
router.get("/admin/pedidos", ...staffOnly, asyncHandler(ctrl.listAdmin));
router.put("/admin/pedidos/:id/estado", ...staffOnly, asyncHandler(ctrl.updateStatus));
router.put("/admin/pagos/:id/verificar", ...staffOnly, asyncHandler(ctrl.verifyPayment));

module.exports = router;
