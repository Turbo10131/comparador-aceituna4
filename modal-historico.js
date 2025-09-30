// modal-historico.js

async function cargarHistorico() {
  try {
    const response = await fetch("precio-aceite-historico.json");
    if (!response.ok) throw new Error("Error al cargar histórico");
    const data = await response.json();

    const tbody = document.getElementById("historico-body");
    tbody.innerHTML = "";

    // Reunir todas las fechas disponibles
    let fechas = new Set();
    Object.values(data).forEach(lista => {
      lista.forEach(entry => fechas.add(entry.fecha));
    });

    fechas = Array.from(fechas).sort((a, b) => new Date(b) - new Date(a));

    fechas.forEach(fecha => {
      // Fila fecha
      const filaFecha = document.createElement("tr");
      filaFecha.innerHTML = `<td colspan="3" class="fecha-barra">${fecha}</td>`;
      tbody.appendChild(filaFecha);

      // Tres tipos de aceite
      ["Aceite de oliva virgen extra", "Aceite de oliva virgen", "Aceite de oliva lampante"].forEach(tipo => {
        const registro = data[tipo].find(e => e.fecha === fecha);
        if (registro) {
          const fila = document.createElement("tr");
          fila.classList.add("sub-row");
          fila.innerHTML = `
            <td></td>
            <td class="tipo">${tipo}</td>
            <td class="precio">${registro.precio_eur_kg.toFixed(3)} €/kg</td>
          `;
          tbody.appendChild(fila);
        }
      });
    });

  } catch (err) {
    console.error("Error cargando histórico:", err);
    const tbody = document.getElementById("historico-body");
    tbody.innerHTML = `<tr><td colspan="3">No hay datos disponibles.</td></tr>`;
  }
}

function setupHistoricoModal() {
  const btn = document.getElementById("historico-btn");
  const modal = document.getElementById("historico-modal");
  const closeBtn = document.getElementById("historico-close");

  if (!btn || !modal || !closeBtn) return;

  btn.addEventListener("click", () => {
    modal.classList.add("open");
    cargarHistorico();
  });

  closeBtn.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
}

document.addEventListener("DOMContentLoaded", setupHistoricoModal);
