// Rutas de reportes: /api/admin/reportes/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/reports.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

router.get("/admin/reportes/dashboard", ...staffOnly, asyncHandler(ctrl.dashboard));
router.get("/admin/reportes/ventas", ...staffOnly, asyncHandler(ctrl.salesReport));
router.get("/admin/reportes/medios-pago", ...staffOnly, asyncHandler(ctrl.paymentMethodsReport));
router.get("/admin/reportes/mas-vendidos", ...staffOnly, asyncHandler(ctrl.topProducts));

module.exports = router;
