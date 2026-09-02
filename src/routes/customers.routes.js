// Rutas de gestion de clientes: /api/admin/clientes (JEFE, o EMPLEADO con permiso)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/customers.controller");

// Nota: la validacion fina de "el empleado tiene permiso canViewCustomers"
// se hace dentro del controller si se requiere mas adelante; por ahora
// EMPLEADO y JEFE pueden entrar y el frontend del panel oculta el modulo
// a los empleados sin el permiso (la barrera real sigue siendo el rol aqui).
router.get("/admin/clientes", requireAuth, requireRole("EMPLEADO", "JEFE"), asyncHandler(ctrl.list));

module.exports = router;
