// ============================================================================
// PUNTO DE ENTRADA DEL SERVIDOR
// ============================================================================
// Carga las variables de entorno (.env) y arranca el servidor HTTP con la
// app de Express definida en app.js.
// ============================================================================

require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n MALMOQ backend corriendo en http://localhost:${PORT}\n`);
});
