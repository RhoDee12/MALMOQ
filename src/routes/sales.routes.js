// Rutas de ventas presenciales: /api/admin/ventas/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/sales.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

router.get("/admin/ventas", ...staffOnly, asyncHandler(ctrl.list));
router.post("/admin/ventas", ...staffOnly, asyncHandler(ctrl.create));
// Anular una venta es una operacion financiera sensible: solo JEFE.
router.put("/admin/ventas/:id/anular", requireAuth, requireRole("JEFE"), asyncHandler(ctrl.voidSale));

module.exports = router;
