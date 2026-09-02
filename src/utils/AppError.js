// ============================================================================
// ERROR CONTROLADO DE LA APLICACION
// ============================================================================
// En vez de lanzar errores genericos, los controllers lanzan "new AppError(...)"
// cuando algo es un problema esperable del negocio (ej: "stock insuficiente",
// "credenciales invalidas", "no tienes permiso"). El errorHandler.js detecta
// estos errores y responde con el codigo HTTP y mensaje correctos; cualquier
// otro error (un bug real) se trata como error interno 500.
// ============================================================================

class AppError extends Error {
  /**
   * @param {string} message - mensaje entendible para mostrar al usuario
   * @param {number} statusCode - codigo HTTP (400, 401, 403, 404, 409, etc.)
   */
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

module.exports = AppError;
