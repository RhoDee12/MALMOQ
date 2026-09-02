// ============================================================================
// SERVICIO DE AUDITORIA (registro de actividad)
// ============================================================================
// Cada vez que un empleado o jefe hace un cambio importante (crear/editar
// producto, cambiar stock, cambiar estado de un pedido, etc.) se guarda un
// registro aca. Sirve para poder responder preguntas como: "quien cambio
// el precio del Pisco y cuando".
// ============================================================================

const prisma = require("../config/prisma");

/**
 * Guarda una entrada de auditoria. Nunca lanza error hacia arriba si algo
 * falla (un fallo de auditoria no deberia romper la operacion principal),
 * solo lo registra en consola.
 *
 * @param {{userId?:number, action:string, entity?:string, entityId?:number, oldValue?:any, newValue?:any}} entry
 */
async function logActivity(entry) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        oldValue: entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null,
      },
    });
  } catch (err) {
    console.error("[activityLog] no se pudo registrar la auditoria:", err.message);
  }
}

module.exports = { logActivity };
