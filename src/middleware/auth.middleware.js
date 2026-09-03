// ============================================================================
// MIDDLEWARE DE AUTENTICACION Y AUTORIZACION
// ============================================================================
// Estas funciones protegen las rutas del backend. IMPORTANTE: esta es la
// UNICA fuente real de seguridad del sistema - lo que el frontend oculta o
// deshabilita visualmente NO alcanza. Cada endpoint sensible debe pasar por
// requireAuth y, cuando corresponda, por requireRole(...).
// ============================================================================

const { verifyToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");

/**
 * Lee el token de la cookie "token", lo valida, y si es correcto agrega
 * "req.user" con los datos basicos del usuario logueado (id, role, email).
 * Si no hay token o es invalido, corta la peticion con 401 (no autorizado).
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw new AppError("Debes iniciar sesion para continuar.", 401);
    }

    const payload = verifyToken(token); // lanza error si el token es invalido/expiro

    // Se vuelve a consultar el usuario en la base de datos (no solo confiar
    // en el token) por si fue desactivado despues de emitido el token.
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      throw new AppError("Tu cuenta no esta disponible.", 401);
    }

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    if (err.isAppError) return next(err);
    next(new AppError("Sesion invalida o expirada. Vuelve a iniciar sesion.", 401));
  }
}

/**
 * Como requireAuth, pero NO corta la peticion si no hay sesion: solo agrega
 * req.user si existe una sesion valida, o lo deja "undefined". Sirve para
 * rutas publicas que se comportan distinto si el visitante esta logueado
 * (ej: mostrar "Mi cuenta" en vez de "Iniciar sesion").
 */
async function attachUserIfLogged(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user && user.isActive) {
      req.user = { id: user.id, role: user.role, email: user.email };
    }
    next();
  } catch {
    next(); // token invalido: simplemente se sigue como visitante anonimo
  }
}

/**
 * Genera un middleware que exige que req.user.role este dentro de la lista
 * de roles permitidos. Debe usarse SIEMPRE despues de requireAuth.
 *
 * Uso: router.post("/productos", requireAuth, requireRole("EMPLEADO", "JEFE"), crearProducto)
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new AppError("Debes iniciar sesion para continuar.", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("No tienes permiso para realizar esta accion.", 403));
    }
    next();
  };
}

/**
 * Exige un permiso GRANULAR de empleado (ver modelo Employee: canManageProducts,
 * canManageOrders, canRegisterSales, canViewCustomers, canEditConfirmedOrders,
 * etc). El JEFE siempre pasa (tiene todos los permisos por definicion, no
 * tiene fila en Employee). Un EMPLEADO sin ese permiso especifico recibe 403,
 * aunque su rol general le alcance para entrar al panel.
 *
 * Debe usarse SIEMPRE despues de requireAuth. Uso:
 *   router.put("/admin/pedidos/:id/estado", ...staffOnly, requireEmployeePermission("canManageOrders"), asyncHandler(ctrl.updateStatus))
 */
function requireEmployeePermission(permissionField) {
  return async function (req, res, next) {
    try {
      if (!req.user) throw new AppError("Debes iniciar sesion para continuar.", 401);
      if (req.user.role === "JEFE") return next(); // el jefe siempre tiene todos los permisos

      const profile = await prisma.employee.findUnique({ where: { userId: req.user.id } });
      if (!profile || !profile[permissionField]) {
        throw new AppError("No tienes permiso para realizar esta accion. Pidele al jefe que te lo habilite.", 403);
      }
      next();
    } catch (err) {
      next(err.isAppError ? err : new AppError("No se pudo verificar tu permiso.", 403));
    }
  };
}

module.exports = { requireAuth, attachUserIfLogged, requireRole, requireEmployeePermission };
