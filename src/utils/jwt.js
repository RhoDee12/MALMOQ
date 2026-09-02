// ============================================================================
// UTILIDADES DE TOKEN (JWT)
// ============================================================================
// El sistema usa JSON Web Tokens para mantener la sesion del usuario, sin
// guardar sesiones en el servidor: el token viaja en una cookie httpOnly
// (el navegador la maneja sola, JavaScript del frontend no puede leerla,
// asi se protege un poco mas contra robo de sesion via XSS).
// ============================================================================

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = "7d"; // la sesion dura 7 dias sin volver a loguearse

/**
 * Genera un token firmado que representa la sesion de un usuario logueado.
 * @param {{id:number, role:string, email:string}} payload - datos minimos del usuario
 * @returns {string} token JWT
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

/**
 * Verifica un token y devuelve su contenido (id, role, email) si es valido.
 * Lanza un error si el token es invalido o expiro.
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken, TOKEN_EXPIRES_IN };
