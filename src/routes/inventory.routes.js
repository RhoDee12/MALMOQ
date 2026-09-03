// Rutas de inventario: /api/admin/inventario/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole, requireEmployeePermission } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/inventory.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];
const canManageInventory = [...staffOnly, requireEmployeePermission("canManageInventory")];

router.get("/admin/inventario", ...canManageInventory, asyncHandler(ctrl.overview));
router.get("/admin/inventario/movimientos", ...canManageInventory, asyncHandler(ctrl.listMovements));
router.post("/admin/inventario/movimiento", ...canManageInventory, asyncHandler(ctrl.registerMovement));

module.exports = router;
