// Rutas de productos: publicas en /api/productos, administrativas en /api/admin/productos
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole, requireEmployeePermission } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/products.controller");

const uploadProductImage = createUploader("productos");
const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];
// SOLO escribir (crear/editar/borrar/imagen) exige canManageProducts. LEER
// la lista se deja en staffOnly nomas porque el POS (Ventas) tambien la
// necesita para buscar productos, y un empleado de ventas no
// necesariamente tiene permiso de gestionar productos.
const canManageProducts = [...staffOnly, requireEmployeePermission("canManageProducts")];

// Publicas (catalogo de la tienda)
router.get("/productos", asyncHandler(ctrl.listPublic));
router.get("/productos/:id", asyncHandler(ctrl.getById));

// Administrativas
router.get("/admin/productos", ...staffOnly, asyncHandler(ctrl.listAdmin));
router.post("/admin/productos", ...canManageProducts, asyncHandler(ctrl.create));
router.put("/admin/productos/:id", ...canManageProducts, asyncHandler(ctrl.update));
router.delete("/admin/productos/:id", ...canManageProducts, asyncHandler(ctrl.remove));
router.post("/admin/productos/:id/imagen", ...canManageProducts, uploadProductImage.single("imagen"), asyncHandler(ctrl.uploadImage));

module.exports = router;
