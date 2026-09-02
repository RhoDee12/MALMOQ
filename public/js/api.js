// ============================================================================
// api.js - funcion central para hablar con el backend (fetch)
// ============================================================================
// TODAS las paginas usan esta unica funcion para llamar a la API, en vez de
// repetir fetch(...) suelto por todos lados. Ventajas:
//   - Siempre manda las cookies de sesion (credentials: "include").
//   - Siempre pone Content-Type: application/json cuando corresponde.
//   - Si el backend responde { ok:false, message }, lanza un error con ese
//     mensaje, para que cada pagina solo tenga que hacer try/catch.
// ============================================================================

const API_BASE = "/api";

/**
 * Llama a un endpoint de la API.
 * @param {string} path - ej: "/productos", "/pedidos"
 * @param {{method?:string, body?:object, isFormData?:boolean}} [options]
 * @returns {Promise<any>} el JSON de la respuesta (ya sin el "ok:true")
 */
async function apiFetch(path, options = {}) {
  const { method = "GET", body, isFormData = false } = options;

  const fetchOptions = {
    method,
    credentials: "include", // manda la cookie httpOnly de sesion
    headers: {},
  };

  if (body !== undefined) {
    if (isFormData) {
      fetchOptions.body = body; // FormData: el navegador pone el Content-Type solo (con boundary)
    } else {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(API_BASE + path, fetchOptions);
  } catch (networkError) {
    throw new Error("No se pudo conectar con el servidor. Verifica tu conexion.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin cuerpo JSON (poco comun, pero no deberia romper la app).
  }

  if (!response.ok || (data && data.ok === false)) {
    throw new Error((data && data.message) || `Error ${response.status}`);
  }

  return data;
}

/** Atajo para subir archivos (imagenes, comprobantes) usando FormData. */
function apiUpload(path, formData, method = "POST") {
  return apiFetch(path, { method, body: formData, isFormData: true });
}

/**
 * Escapa texto antes de insertarlo como HTML (evita que el nombre de un
 * producto/cliente con caracteres como "<" rompa la pagina o inyecte HTML).
 * Se usa en TODAS las paginas (publicas y admin) al armar HTML con datos
 * que vienen de la base de datos.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
