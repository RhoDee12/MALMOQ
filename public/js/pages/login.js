// ============================================================================
// login.js - logica de la pagina de login (login.html)
// ============================================================================
// Sirve para los 3 roles (cliente, empleado, jefe): todos usan el mismo
// formulario. Segun el "role" que devuelva el backend, se redirige a la
// tienda o al panel administrativo. Tambien respeta "?volver=" para volver
// a la pagina desde la que se pidio iniciar sesion (ej: el checkout).
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form-login").addEventListener("submit", handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-login");
  const errorBox = document.getElementById("login-error");
  errorBox.hidden = true;
  btn.disabled = true;
  btn.textContent = "Ingresando...";

  try {
    const email = document.getElementById("input-email").value.trim();
    const password = document.getElementById("input-password").value;

    const { user } = await apiFetch("/auth/login", { method: "POST", body: { email, password } });

    const volver = new URLSearchParams(window.location.search).get("volver");
    if (volver) {
      window.location.href = volver;
    } else if (user.role === "EMPLEADO" || user.role === "JEFE") {
      window.location.href = "/admin/dashboard.html";
    } else {
      window.location.href = "/mi-cuenta.html";
    }
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Ingresar";
  }
}
