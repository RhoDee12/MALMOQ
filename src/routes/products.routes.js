// Rutas de productos: publicas en /api/productos, administrativas en /api/admin/productos
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/products.controller");

const uploadProductImage = createUploader("productos");
const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];

// Publicas (catalogo de la tienda)
router.get("/productos", asyncHandler(ctrl.listPublic));
router.get("/productos/:id", asyncHandler(ctrl.getById));

// Administrativas
router.get("/admin/productos", ...staffOnly, asyncHandler(ctrl.listAdmin));
router.post("/admin/productos", ...staffOnly, asyncHandler(ctrl.create));
router.put("/admin/productos/:id", ...staffOnly, asyncHandler(ctrl.update));
router.delete("/admin/productos/:id", ...staffOnly, asyncHandler(ctrl.remove));
router.post("/admin/productos/:id/imagen", ...staffOnly, uploadProductImage.single("imagen"), asyncHandler(ctrl.uploadImage));

module.exports = router;
