// Rutas de gestion de clientes: /api/admin/clientes (JEFE, o EMPLEADO con permiso)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole, requireEmployeePermission } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/customers.controller");

router.get(
  "/admin/clientes",
  requireAuth,
  requireRole("EMPLEADO", "JEFE"),
  requireEmployeePermission("canViewCustomers"),
  asyncHandler(ctrl.list)
);

module.exports = router;
