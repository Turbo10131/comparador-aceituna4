async function cargarHistorico() {
  try {
    const response = await fetch("precio-aceite-historico.json");
    if (!response.ok) throw new Error("Error al cargar el histórico");

    const data = await response.json();
    const tbody = document.querySelector("#historico-body");
    tbody.innerHTML = "";

    // Ordenar por fecha descendente (última primero)
    data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    data.forEach(entry => {
      // Fila de la fecha
      const filaFecha = document.createElement("tr");
      filaFecha.innerHTML = `
        <td colspan="3" class="fecha-barra">${entry.fecha}</td>
      `;
      tbody.appendChild(filaFecha);

      // Fila para cada tipo de aceite
      [
        "Aceite de oliva virgen extra",
        "Aceite de oliva virgen",
        "Aceite de oliva lampante"
      ].forEach(tipo => {
        if (entry[tipo] !== undefined) {
          const fila = document.createElement("tr");
          fila.classList.add("sub-row");
          fila.innerHTML = `
            <td></td>
            <td class="tipo"><em>${tipo}</em></td>
            <td class="precio">${entry[tipo].toFixed(3)} €/kg</td>
          `;
          tbody.appendChild(fila);
        }
      });
    });

  } catch (err) {
    console.error("[Histórico] Error:", err);
    const tbody = document.querySelector("#historico-body");
    tbody.innerHTML = `<tr><td colspan="3">❌ Error al cargar el histórico</td></tr>`;
  }
}

// Asociamos el evento al botón
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-historico");
  const modal = document.getElementById("historico-modal");
  const closeBtn = document.getElementById("historico-close");

  if (btn && modal) {
    btn.addEventListener("click", () => {
      cargarHistorico();
      modal.classList.add("open");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("open");
    });
  }

  modal?.addEventListener("click", e => {
    if (e.target === modal) modal.classList.remove("open");
  });
});

