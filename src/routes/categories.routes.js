// Rutas de categorias: publicas en /api/categorias, administrativas en /api/admin/categorias
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/categories.controller");

const uploadCategoryImage = createUploader("categorias");
const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

// Publicas
router.get("/categorias", asyncHandler(ctrl.listPublic));

// Administrativas
router.get("/admin/categorias", ...staffOnly, asyncHandler(ctrl.listAll));
router.post("/admin/categorias", ...staffOnly, asyncHandler(ctrl.create));
router.put("/admin/categorias/:id", ...staffOnly, asyncHandler(ctrl.update));
router.delete("/admin/categorias/:id", ...staffOnly, asyncHandler(ctrl.remove));
router.post("/admin/categorias/:id/imagen", ...staffOnly, uploadCategoryImage.single("imagen"), asyncHandler(ctrl.uploadImage));

module.exports = router;
