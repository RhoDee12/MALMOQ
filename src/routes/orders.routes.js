// Rutas de pedidos: /api/pedidos/* (cliente) y /api/admin/pedidos/* (empleado/jefe)
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole, requireEmployeePermission } = require("../middleware/auth.middleware");
const { createUploader } = require("../middleware/upload.middleware");
const ctrl = require("../controllers/orders.controller");

const uploadPaymentProof = createUploader("comprobantes-pago");
const staffOnly = [requireAuth, requireRole("EMPLEADO", "JEFE")];
// Gestionar pedidos (ver estado, cambiarlo, confirmar venta) requiere el
// permiso canManageOrders - el jefe lo tiene siempre; un empleado solo si
// se lo habilitaron en Empleados (antes este permiso existia en la base de
// datos pero no se exigia en ningun lado, quedaba solo decorativo).
const canManageOrders = [...staffOnly, requireEmployeePermission("canManageOrders")];

// Cliente
router.post("/pedidos", requireAuth, asyncHandler(ctrl.create));
router.get("/pedidos/mios", requireAuth, asyncHandler(ctrl.listMine));
router.get("/pedidos/:id", requireAuth, asyncHandler(ctrl.getById));
router.post("/pedidos/:id/pago", requireAuth, uploadPaymentProof.single("comprobante"), asyncHandler(ctrl.attachPayment));

// Empleado (con permiso) / jefe
router.get("/admin/pedidos", ...canManageOrders, asyncHandler(ctrl.listAdmin));
router.put("/admin/pedidos/:id/estado", ...canManageOrders, asyncHandler(ctrl.updateStatus));
router.put("/admin/pedidos/:id/confirmar", ...canManageOrders, asyncHandler(ctrl.confirmOrder));
router.put("/admin/pagos/:id/verificar", ...canManageOrders, asyncHandler(ctrl.verifyPayment));

// Desbloquear un pedido ya confirmado es exclusivo del JEFE (ver comentario en el controller).
router.put("/admin/pedidos/:id/desbloquear", requireAuth, requireRole("JEFE"), asyncHandler(ctrl.unlockOrder));

module.exports = router;
