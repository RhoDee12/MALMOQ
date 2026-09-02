// ============================================================================
// cart.js - carrito de compras guardado en localStorage del navegador
// ============================================================================
// El carrito vive en el navegador (no en la base de datos) para que
// funcione sin iniciar sesion y sea instantaneo. IMPORTANTE: esto es solo
// para la EXPERIENCIA del cliente - el precio y la disponibilidad real
// SIEMPRE se vuelven a verificar en el backend al momento de pagar (ver
// public/js/pages/checkout.js y src/controllers/orders.controller.js).
//
// Estructura guardada en localStorage["malmoq_carrito"]:
//   [{ productId, name, imageUrl, unitPrice, quantity }, ...]
// ============================================================================

const CART_STORAGE_KEY = "malmoq_carrito";

/** Lee el carrito completo desde localStorage (arreglo vacio si no hay nada). */
function cartGetItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cartSaveItems(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  cartUpdateBadge();
}

/**
 * Agrega un producto al carrito (o suma la cantidad si ya estaba).
 * @param {{id:number, name:string, imageUrl:string|null, effectivePrice:number}} product
 * @param {number} quantity
 */
function cartAddItem(product, quantity = 1) {
  const items = cartGetItems();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl || null,
      unitPrice: product.effectivePrice,
      quantity,
    });
  }
  cartSaveItems(items);
}

function cartSetQuantity(productId, quantity) {
  let items = cartGetItems();
  if (quantity <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const item = items.find((i) => i.productId === productId);
    if (item) item.quantity = quantity;
  }
  cartSaveItems(items);
}

function cartRemoveItem(productId) {
  const items = cartGetItems().filter((i) => i.productId !== productId);
  cartSaveItems(items);
}

function cartClear() {
  cartSaveItems([]);
}

function cartCount() {
  return cartGetItems().reduce((sum, i) => sum + i.quantity, 0);
}

function cartTotal() {
  return cartGetItems().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/** Actualiza el numerito rojo del carrito en el navbar (si existe en la pagina). */
function cartUpdateBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.classList.toggle("d-none", count === 0);
}

document.addEventListener("DOMContentLoaded", cartUpdateBadge);
