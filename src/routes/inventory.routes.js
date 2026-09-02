// Rutas de inventario: /api/admin/inventario/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/inventory.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

router.get("/admin/inventario", ...staffOnly, asyncHandler(ctrl.overview));
router.get("/admin/inventario/movimientos", ...staffOnly, asyncHandler(ctrl.listMovements));
router.post("/admin/inventario/movimiento", ...staffOnly, asyncHandler(ctrl.registerMovement));

module.exports = router;
