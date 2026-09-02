// Rutas de marcas: /api/marcas (publica), /api/admin/marcas (administrativa)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/brands.controller");

const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

router.get("/marcas", asyncHandler(ctrl.listPublic));
router.post("/admin/marcas", ...staffOnly, asyncHandler(ctrl.create));
router.delete("/admin/marcas/:id", ...staffOnly, asyncHandler(ctrl.remove));

module.exports = router;
