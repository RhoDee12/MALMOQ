// ============================================================================
// CONTROLADOR DEL CARRITO (verificacion de stock)
// ============================================================================
// El carrito en si vive en el navegador (localStorage, ver public/js/cart.js)
// para que funcione sin necesidad de iniciar sesion. Este endpoint SOLO
// sirve para consultar, contra la base de datos, si lo que hay en el
// carrito sigue disponible - la verificacion DEFINITIVA vuelve a pasar en
// el backend al confirmar el pedido (orders.controller.js), asi que esto
// es solo para avisar al cliente lo antes posible, no es la unica barrera.
// ============================================================================

const { findInsufficientStock } = require("../services/stock.service");
const AppError = require("../utils/AppError");

/**
 * POST /api/carrito/verificar
 * Body: { items: [{ productId, quantity }, ...] }
 */
async function verify(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items)) throw new AppError("Formato de carrito invalido.");

  const problems = await findInsufficientStock(items.map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity), saleType: i.saleType })));
  res.json({ ok: true, disponible: problems.length === 0, problemas: problems });
}

module.exports = { verify };
