// ============================================================================
// carousel.js - controla las flechas Y el auto-avance de los carruseles horizontales
// ============================================================================
// Se usa para las secciones de categorias y productos del Home (scroll
// horizontal con snap, ver .carrusel-pista en style.css). No es una libreria
// externa: mueve el scroll del contenedor solo (con un intervalo) y con las
// flechas prev/next. Al llegar al final, vuelve suavemente al inicio.
// ============================================================================

/**
 * Conecta los botones "prev/next" de un carrusel con su pista de scroll, y
 * activa el auto-avance (se pausa mientras el mouse esta encima o mientras
 * el usuario lo toca en el celular, para no pelearse con el usuario).
 * @param {string} pistaId - id del contenedor con clase "carrusel-pista"
 * @param {string} prevId - id del boton de flecha izquierda
 * @param {string} nextId - id del boton de flecha derecha
 * @param {{auto?:boolean, intervalMs?:number}} [options] - auto (default true), intervalMs (default 2800)
 */
function initCarrusel(pistaId, prevId, nextId, options = {}) {
  const pista = document.getElementById(pistaId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if (!pista) return;

  const auto = options.auto !== false;
  const intervalMs = options.intervalMs || 2800;
  let temporizador = null;

  const distanciaScroll = () => Math.min(pista.clientWidth * 0.8, 600);

  function avanzarUnPaso() {
    const maxScroll = pista.scrollWidth - pista.clientWidth;
    if (maxScroll <= 4) return; // el contenido entra completo, no hay nada que mover
    if (pista.scrollLeft >= maxScroll - 4) {
      pista.scrollTo({ left: 0, behavior: "smooth" }); // llego al final: vuelve al inicio
    } else {
      pista.scrollBy({ left: distanciaScroll(), behavior: "smooth" });
    }
  }

  function iniciarAutoAvance() {
    if (!auto) return;
    detenerAutoAvance();
    temporizador = setInterval(avanzarUnPaso, intervalMs);
  }
  function detenerAutoAvance() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }

  prev?.addEventListener("click", () => {
    pista.scrollBy({ left: -distanciaScroll(), behavior: "smooth" });
    iniciarAutoAvance(); // reinicia el conteo para no "chocar" con el auto-avance
  });
  next?.addEventListener("click", () => {
    avanzarUnPaso();
    iniciarAutoAvance();
  });

  if (auto) {
    iniciarAutoAvance();
    // Se pausa mientras el usuario interactua (mouse encima, o tocando en celular).
    pista.addEventListener("mouseenter", detenerAutoAvance);
    pista.addEventListener("mouseleave", iniciarAutoAvance);
    pista.addEventListener("touchstart", detenerAutoAvance, { passive: true });
    pista.addEventListener("touchend", () => setTimeout(iniciarAutoAvance, 2500), { passive: true });
  }
}
