// ==========================
// Función para calcular precio de aceituna
// ==========================
function calcularPrecio() {
  const rendimiento = parseFloat(document.getElementById("rendimiento").value);
  const tipo = document.getElementById("tipo").value;

  if (isNaN(rendimiento) || rendimiento <= 0 || rendimiento > 100 || !tipo) {
    document.getElementById("resultado").innerHTML =
      "<p style='color:red'>⚠️ Introduce un rendimiento válido y selecciona un tipo de aceite.</p>";
    return;
  }

  let precioLitro;
  switch (tipo) {
    case "virgen_extra":
      precioLitro = 4.080;
      break;
    case "virgen":
      precioLitro = 3.633;
      break;
    case "lampante":
      precioLitro = 3.500;
      break;
    default:
      precioLitro = 0;
  }

  if (precioLitro > 0) {
    const precioAceituna = (rendimiento / 100) * precioLitro;
    document.getElementById("resultado").innerHTML =
      `<p>💶 Precio estimado de la aceituna: <strong>${precioAceituna.toFixed(3)} €/kg</strong></p>`;
  }
}

// ==========================
// Abrir / cerrar modales
// ==========================

// Modal histórico
const modalHistorico = document.getElementById("historico-modal");
const btnConsultar = document.getElementById("consultar-btn");
const btnCerrarHistorico = document.getElementById("historico-close");

if (btnConsultar) {
  btnConsultar.addEventListener("click", () => {
    modalHistorico.style.display = "block";
  });
}

if (btnCerrarHistorico) {
  btnCerrarHistorico.addEventListener("click", () => {
    modalHistorico.style.display = "none";
  });
}

// Modal fuente
const modalFuente = document.getElementById("fuente-modal");
const btnFuente = document.getElementById("fuente-link");
const btnCerrarFuente = document.getElementById("fuente-close");

if (btnFuente) {
  btnFuente.addEventListener("click", () => {
    modalFuente.style.display = "block";
  });
}

if (btnCerrarFuente) {
  btnCerrarFuente.addEventListener("click", () => {
    modalFuente.style.display = "none";
  });
}

// ==========================
// Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("tipo");
  const rendimientoInput = document.getElementById("rendimiento");

  if (tipoSelect && rendimientoInput) {
    tipoSelect.addEventListener("change", calcularPrecio);
    rendimientoInput.addEventListener("input", calcularPrecio);
  }
});
