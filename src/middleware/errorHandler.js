// ============================================================================
// MANEJADOR CENTRAL DE ERRORES
// ============================================================================
// Se registra al final de todos los middlewares/rutas en app.js. Express lo
// detecta automaticamente porque tiene 4 parametros (err, req, res, next).
// Cualquier error que llegue aca (via next(err) o una promesa rechazada
// dentro de asyncHandler) se convierte en una respuesta JSON consistente.
// ============================================================================

function errorHandler(err, req, res, next) {
  // Errores esperados del negocio (AppError): usan su propio codigo HTTP.
  if (err.isAppError) {
    return res.status(err.statusCode).json({ ok: false, message: err.message });
  }

  // Cualquier otro error es inesperado (un bug): se registra en consola
  // para poder revisarlo, pero al usuario se le da un mensaje generico
  // (no se le muestra el detalle tecnico por seguridad).
  console.error("[ERROR NO CONTROLADO]", err);
  res.status(500).json({
    ok: false,
    message: "Ocurrio un error inesperado en el servidor.",
  });
}

module.exports = errorHandler;
