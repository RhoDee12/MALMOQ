// ============================================================================
// CONSTANTES DEL SISTEMA
// ============================================================================
// SQLite (usado en desarrollo) no soporta "enum" en Prisma, asi que esos
// campos se guardan como texto (String) en la base de datos. Este archivo
// centraliza los valores permitidos para cada uno, y el backend los valida
// aca antes de guardar nada. Si un dato no esta en esta lista, se rechaza.
// ============================================================================

// Roles de usuario.
const ROLES = Object.freeze({
  CLIENTE: "CLIENTE",
  EMPLEADO: "EMPLEADO",
  JEFE: "JEFE",
});

// Tipos de movimiento de inventario.
const MOVEMENT_TYPES = Object.freeze({
  ENTRADA: "ENTRADA",
  SALIDA: "SALIDA",
  AJUSTE: "AJUSTE",
  VENTA: "VENTA",
  DEVOLUCION: "DEVOLUCION",
});

// Estados posibles de un pedido, EN ORDEN del flujo normal.
const ORDER_STATUSES = Object.freeze({
  PENDIENTE: "PENDIENTE",
  PAGO_PENDIENTE: "PAGO_PENDIENTE",
  PAGO_CONFIRMADO: "PAGO_CONFIRMADO",
  PREPARANDO: "PREPARANDO",
  EN_CAMINO: "EN_CAMINO",
  LISTO_RECOJO: "LISTO_RECOJO",
  ENTREGADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
});

// Modalidad de entrega del pedido.
const DELIVERY_MODES = Object.freeze({
  DELIVERY: "DELIVERY",
  RECOJO: "RECOJO",
});

// Canal por el que se registro una venta.
const SALE_CHANNELS = Object.freeze({
  ONLINE: "ONLINE",
  PRESENCIAL: "PRESENCIAL",
});

// Como se vendio una linea de pedido/venta: por unidad suelta o por caja
// cerrada (solo valido si el producto tiene unitsPerBox/boxPrice configurados).
const SALE_TYPES = Object.freeze({
  UNIDAD: "UNIDAD",
  CAJA: "CAJA",
});

// Medios de pago soportados.
const PAYMENT_METHOD_TYPES = Object.freeze({
  EFECTIVO: "EFECTIVO",
  YAPE: "YAPE",
  PLIN: "PLIN",
  TARJETA_POCKET_POS: "TARJETA_POCKET_POS",
});

module.exports = {
  ROLES,
  MOVEMENT_TYPES,
  ORDER_STATUSES,
  DELIVERY_MODES,
  SALE_CHANNELS,
  PAYMENT_METHOD_TYPES,
  SALE_TYPES,
};
