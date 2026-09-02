// ============================================================================
// APLICACION EXPRESS - punto central donde se conecta todo
// ============================================================================
// Aca se configuran los middlewares globales (JSON, cookies, CORS), se
// sirven los archivos estaticos del frontend (public/), se montan todas
// las rutas de la API bajo /api/*, y al final se registra el manejador
// de errores. El ORDEN de app.use() importa en Express.
// ============================================================================

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const errorHandler = require("./middleware/errorHandler");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiters");

const app = express();

// --- Seguridad: cabeceras HTTP (helmet) -------------------------------------
// Agrega automaticamente cabeceras que evitan clases enteras de ataques:
// X-Content-Type-Options (evita que el navegador "adivine" tipos de
// archivo), X-Frame-Options/frame-ancestors (evita que la pagina se
// embeba en un iframe ajeno para "clickjacking"), Strict-Transport-Security
// (fuerza HTTPS una vez desplegado), etc.
// contentSecurityPolicy se deja desactivado por ahora porque el sitio
// carga Bootstrap y Google Fonts desde CDNs externos (bloquearlos rompería
// el estilo); se puede afinar mas adelante con una lista blanca de esos
// dominios especificos si se quiere una politica mas estricta.
app.use(helmet({ contentSecurityPolicy: false }));

// --- CORS --------------------------------------------------------------
// origin:true + credentials:true refleja el origen que hizo la peticion
// (necesario para que la cookie de sesion viaje). Es razonable mientras la
// tienda y la API viven en el mismo dominio (como aca). Si en produccion
// el frontend se sirve desde OTRO dominio, cambiar "origin: true" por la
// URL exacta permitida (ej: origin: "https://malmoq.pe") para no aceptar
// peticiones autenticadas desde cualquier sitio.
app.use(cors({ origin: true, credentials: true }));

// --- Limite de peticiones por IP (ver src/middleware/rateLimiters.js) ------
app.use("/api/auth", authLimiter); // login/registro: limite estricto contra fuerza bruta
app.use("/api", apiLimiter); // resto de la API: limite general contra abuso/DoS basico

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// --- Archivos estaticos del FRONTEND (HTML/CSS/JS separados, ver public/) ---
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Rutas de la API -------------------------------------------------------
// Cada archivo en src/routes/ agrupa un area del sistema. Se montan todas
// bajo el prefijo comun "/api" para separarlas claramente de las paginas HTML.
const apiRouter = express.Router();
// auth.routes.js define sus paths sin el prefijo "/auth" (ej: "/login"), asi
// que se monta aparte bajo "/auth" para que queden en /api/auth/login, etc.
apiRouter.use("/auth", require("./routes/auth.routes"));
apiRouter.use(require("./routes/categories.routes"));
apiRouter.use(require("./routes/products.routes"));
apiRouter.use(require("./routes/brands.routes"));
apiRouter.use(require("./routes/inventory.routes"));
apiRouter.use(require("./routes/orders.routes"));
apiRouter.use(require("./routes/sales.routes"));
apiRouter.use(require("./routes/settings.routes"));
apiRouter.use(require("./routes/reports.routes"));
apiRouter.use(require("./routes/employees.routes"));
apiRouter.use(require("./routes/customers.routes"));
apiRouter.use(require("./routes/content.routes"));
apiRouter.use(require("./routes/cart.routes"));
app.use("/api", apiRouter);

// Healthcheck simple (util para saber si el servidor esta vivo, ej: en el hosting).
app.get("/api/salud", (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// --- 404 para rutas de API que no existen ----------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, message: "Ruta de API no encontrada." });
});

// --- Manejador central de errores (siempre al final) -----------------------
app.use(errorHandler);

module.exports = app;
