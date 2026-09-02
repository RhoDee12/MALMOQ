// ============================================================================
// carousel.js - controla las flechas de los carruseles horizontales
// ============================================================================
// Se usa para las secciones de categorias y productos del Home (scroll
// horizontal con snap, ver .carrusel-pista en style.css). No es una libreria
// externa: solo mueve el scroll del contenedor al presionar las flechas.
// ============================================================================

/**
 * Conecta los botones "prev/next" de un carrusel con su pista de scroll.
 * @param {string} pistaId - id del contenedor con clase "carrusel-pista"
 * @param {string} prevId - id del boton de flecha izquierda
 * @param {string} nextId - id del boton de flecha derecha
 */
function initCarrusel(pistaId, prevId, nextId) {
  const pista = document.getElementById(pistaId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if (!pista || !prev || !next) return;

  const distanciaScroll = () => Math.min(pista.clientWidth * 0.8, 600);

  prev.addEventListener("click", () => pista.scrollBy({ left: -distanciaScroll(), behavior: "smooth" }));
  next.addEventListener("click", () => pista.scrollBy({ left: distanciaScroll(), behavior: "smooth" }));
}
