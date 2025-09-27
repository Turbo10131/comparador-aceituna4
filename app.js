// ===============================
// 📌 Cargar precios actuales
// ===============================
async function cargarPrecios() {
  try {
    const response = await fetch("precio-aceite.json");
    const data = await response.json();

    const tabla = document.querySelector("#tabla-precios");
    tabla.innerHTML = "";

    Object.entries(data).forEach(([tipo, precio]) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${tipo}</td>
        <td>${precio.toFixed(3)} €/kg</td>
      `;
      tabla.appendChild(fila);
    });
  } catch (error) {
    console.error("Error cargando precios:", error);
  }
}

// ===============================
// 📌 Calculadora precio aceituna
// ===============================
function calcularPrecio() {
  const rendimiento = parseFloat(document.querySelector("#rendimiento").value) / 100;
  const tipo = document.querySelector("#tipo").value;

  if (!rendimiento || !tipo) {
    document.querySelector("#resultado").innerText = "";
    return;
  }

  fetch("precio-aceite.json")
    .then(res => res.json())
    .then(data => {
      let precioAceite = 0;

      if (tipo === "virgen_extra") precioAceite = data["Aceite de oliva virgen extra"];
      else if (tipo === "virgen") precioAceite = data["Aceite de oliva virgen"];
      else if (tipo === "lampante") precioAceite = data["Aceite de oliva lampante"];

      const precioAceituna = (precioAceite * rendimiento).toFixed(3);
      document.querySelector("#resultado").innerText =
        `Precio estimado de la aceituna: ${precioAceituna} €/kg`;
    });
}

// ===============================
// 📌 Eventos
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  cargarPrecios(); // carga inicial al abrir la web
  document.querySelector("#rendimiento").addEventListener("input", calcularPrecio);
  document.querySelector("#tipo").addEventListener("change", calcularPrecio);

  // Botón histórico
  document.querySelector("#consultar-btn").addEventListener("click", () => {
    document.querySelector("#historico-modal").style.display = "block";
  });
  document.querySelector("#historico-close").addEventListener("click", () => {
    document.querySelector("#historico-modal").style.display = "none";
  });

  // Botón fuente
  document.querySelector("#fuente-link").addEventListener("click", () => {
    document.querySelector("#fuente-modal").style.display = "block";
  });
  document.querySelector("#fuente-close").addEventListener("click", () => {
    document.querySelector("#fuente-modal").style.display = "none";
  });
});
