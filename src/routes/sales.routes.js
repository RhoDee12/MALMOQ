// Rutas de ventas presenciales: /api/admin/ventas/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole, requireEmployeePermission } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/sales.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];
// Igual que canManageOrders en pedidos: este permiso ya existia en el
// modelo Employee pero no se exigia en ningun lado.
const canRegisterSales = [...staffOnly, requireEmployeePermission("canRegisterSales")];

router.get("/admin/ventas", ...canRegisterSales, asyncHandler(ctrl.list));
router.get("/admin/ventas/:id", ...canRegisterSales, asyncHandler(ctrl.getById));
router.post("/admin/ventas", ...canRegisterSales, asyncHandler(ctrl.create));
// Anular una venta es una operacion financiera sensible: solo JEFE.
router.put("/admin/ventas/:id/anular", requireAuth, requireRole("JEFE"), asyncHandler(ctrl.voidSale));

module.exports = router;
