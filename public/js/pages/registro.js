// ============================================================================
// registro.js - logica de la pagina de registro de clientes (registro.html)
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form-registro").addEventListener("submit", handleRegistro);
});

async function handleRegistro(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-registro");
  const errorBox = document.getElementById("registro-error");
  errorBox.hidden = true;
  btn.disabled = true;
  btn.textContent = "Creando cuenta...";

  try {
    const body = {
      firstName: document.getElementById("input-nombre").value.trim(),
      lastName: document.getElementById("input-apellidos").value.trim(),
      email: document.getElementById("input-email").value.trim(),
      phone: document.getElementById("input-celular").value.trim(),
      address: document.getElementById("input-direccion").value.trim(),
      reference: document.getElementById("input-referencia").value.trim(),
      password: document.getElementById("input-password").value,
    };

    await apiFetch("/auth/registro", { method: "POST", body });
    window.location.href = "/mi-cuenta.html";
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear cuenta";
  }
}
