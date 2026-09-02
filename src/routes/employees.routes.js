// Rutas de gestion de empleados: /api/admin/empleados/* (solo JEFE)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/employees.controller");

const jefeOnly = [requireAuth, requireRole("JEFE")];

router.get("/admin/empleados", ...jefeOnly, asyncHandler(ctrl.list));
router.post("/admin/empleados", ...jefeOnly, asyncHandler(ctrl.create));
router.put("/admin/empleados/:id", ...jefeOnly, asyncHandler(ctrl.update));
router.put("/admin/empleados/:id/contrasena", ...jefeOnly, asyncHandler(ctrl.resetPassword));

module.exports = router;
