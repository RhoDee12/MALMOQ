// ============================================================================
// LIMITADORES DE VELOCIDAD (rate limiting) - proteccion contra fuerza bruta
// ============================================================================
// Sin esto, alguien podria escribir un script que pruebe miles de
// contrasenas por minuto contra /api/auth/login (ataque de fuerza bruta),
// o inundar la API de peticiones para tirarla abajo (ataque de denegacion
// de servicio basico). Estos limitadores cortan esa posibilidad limitando
// cuantas peticiones puede hacer una misma IP en una ventana de tiempo.
// ============================================================================

const rateLimit = require("express-rate-limit");

/**
 * Limite ESTRICTO para login/registro: una IP no puede intentar mas de 10
 * veces en 15 minutos. Es la defensa principal contra fuerza bruta de
 * contrasenas y contra "credential stuffing" (probar pares usuario/clave
 * filtrados de otros sitios).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
});

/**
 * Limite GENERAL para toda la API: evita que una sola IP sature el
 * servidor con peticiones (por error de un script, o a proposito).
 * 300 peticiones cada 5 minutos es generoso para un uso normal de la
 * tienda (navegar productos, carrito, etc.) pero corta abusos.
 */
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Demasiadas peticiones. Espera un momento." },
});

module.exports = { authLimiter, apiLimiter };
