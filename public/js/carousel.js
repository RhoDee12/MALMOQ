// ============================================================================
// carousel.js - "cinta" de auto-avance continuo, en un solo sentido, en loop
// ============================================================================
// A diferencia de un carrusel que avanza y "rebota" de vuelta al inicio,
// esto se mueve SIEMPRE hacia la derecha, sin parar, y cuando el ultimo
// producto pasa, sigue con el primero de nuevo - como una cinta que gira.
//
// Como se logra el efecto infinito sin saltos visibles:
// el contenedor (.carrusel-pista) debe traer el contenido DUPLICADO (la
// misma lista de items, dos veces seguidas - lo arma public/js/pages/home.js).
// El scroll avanza de a poco en cada cuadro (requestAnimationFrame). Cuando
// llega exactamente a la mitad del ancho total (justo donde empieza la
// segunda copia), se le resta esa mitad al scroll SIN animacion - como la
// segunda copia es identica a la primera, ese salto no se nota, y visualmente
// parece que la cinta nunca deja de girar hacia el mismo lado.
//
// La mitad del ancho se vuelve a medir en CADA cuadro (pista.scrollWidth/2)
// en vez de guardarla una sola vez, porque el contenido llega de la API de
// forma asincrona (cuando initCarrusel() arranca, la pista todavia puede
// estar vacia o decir "Cargando...") - asi siempre queda actualizada.
// ============================================================================

/**
 * @param {string} pistaId - id del contenedor con clase "carrusel-pista" (debe tener el contenido duplicado x2)
 * @param {string} prevId - id del boton de flecha izquierda (opcional)
 * @param {string} nextId - id del boton de flecha derecha (opcional)
 * @param {{auto?:boolean, pxPorSegundo?:number}} [options] - auto (default true), velocidad en pixeles/segundo (default 35)
 */
function initCarrusel(pistaId, prevId, nextId, options = {}) {
  const pista = document.getElementById(pistaId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if (!pista) return;

  const auto = options.auto !== false;
  const velocidad = options.pxPorSegundo || 35;

  let rafId = null;
  let ultimoTimestamp = null;
  let pausado = false;

  function paso(timestamp) {
    if (ultimoTimestamp === null) ultimoTimestamp = timestamp;
    const deltaSegundos = (timestamp - ultimoTimestamp) / 1000;
    ultimoTimestamp = timestamp;

    const mitad = pista.scrollWidth / 2;
    if (!pausado && mitad > 20) {
      pista.scrollLeft += velocidad * deltaSegundos;
      if (pista.scrollLeft >= mitad) {
        pista.scrollLeft -= mitad; // vuelta invisible: la copia 2 es identica a la copia 1
      }
    }
    rafId = requestAnimationFrame(paso);
  }

  function iniciar() {
    if (!auto || rafId !== null) return;
    ultimoTimestamp = null;
    rafId = requestAnimationFrame(paso);
  }
  function detener() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Flechas: avanzan/retroceden un salto manual, sin salir del loop.
  const saltoManual = () => Math.min(pista.clientWidth * 0.8, 600);
  next?.addEventListener("click", () => {
    const mitad = pista.scrollWidth / 2;
    pista.scrollLeft += saltoManual();
    if (mitad > 0 && pista.scrollLeft >= mitad) pista.scrollLeft -= mitad;
  });
  prev?.addEventListener("click", () => {
    const mitad = pista.scrollWidth / 2;
    pista.scrollLeft -= saltoManual();
    if (pista.scrollLeft < 0 && mitad > 0) pista.scrollLeft += mitad;
  });

  if (auto) {
    iniciar();
    // Se pausa mientras el usuario interactua (mouse encima, o tocando en celular).
    pista.addEventListener("mouseenter", () => { pausado = true; });
    pista.addEventListener("mouseleave", () => { pausado = false; });
    pista.addEventListener("touchstart", () => { pausado = true; }, { passive: true });
    pista.addEventListener("touchend", () => { setTimeout(() => { pausado = false; }, 1500); }, { passive: true });
  }
}
