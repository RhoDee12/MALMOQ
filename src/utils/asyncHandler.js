// ============================================================================
// ENVOLTORIO PARA FUNCIONES ASYNC EN RUTAS DE EXPRESS
// ============================================================================
// Express, por defecto, no atrapa errores lanzados dentro de funciones
// "async" (promesas rechazadas) y la app se puede quedar colgada o crashear
// sin responder al cliente. Esta funcion envuelve cada controller: si algo
// falla adentro, el error se pasa automaticamente a next(err), que termina
// en el middleware de manejo de errores (errorHandler.js) y responde bien.
//
// Uso: router.get("/ruta", asyncHandler(miController))
// ============================================================================

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
