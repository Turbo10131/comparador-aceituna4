// modal-historico.js

let historicoDatos = [];

// Cargar precios del archivo TXT
async function cargarHistorico() {
  try {
    const response = await fetch("precios 2015.txt");
    if (!response.ok) throw new Error("No se pudo cargar precios 2015.txt");

    const texto = await response.text();
    const lineas = texto.split("\n").map(l => l.trim()).filter(l => l !== "");

    let fechaActual = null;
    let registros = [];

    lineas.forEach(linea => {
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        fechaActual = linea; // ya está en DD-MM-YYYY
      } else if (fechaActual) {
        const partes = linea.split(" ");
        const precio = partes.pop();
        const tipo = partes.join(" ");

        registros.push({
          fecha: fechaActual,
          tipo,
          precio
        });
      }
    });

    historicoDatos = registros;
    renderHistorico(historicoDatos);
  } catch (err) {
    console.error("Error cargando histórico:", err);
  }
}

// Pintar tabla histórica
function renderHistorico(datos) {
  const tbody = document.getElementById("historico-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  let fechaActual = "";
  datos.forEach(reg => {
    if (reg.fecha !== fechaActual) {
      fechaActual = reg.fecha;

      const trFecha = document.createElement("tr");
      trFecha.innerHTML = `
        <td colspan="3" class="fecha-barra"><strong>${fechaActual}</strong></td>
      `;
      tbody.appendChild(trFecha);
    }

    const tr = document.createElement("tr");
    tr.classList.add("sub-row");
    tr.innerHTML = `
      <td></td>
      <td class="tipo">${reg.tipo}</td>
      <td class="precio">${parseFloat(reg.precio).toFixed(3)} €/kg</td>
    `;
    tbody.appendChild(tr);
  });
}

// Filtrar por rango de fechas
function filtrarPorRango(desde, hasta) {
  return historicoDatos.filter(reg => {
    const [d, m, y] = reg.fecha.split("-");
    const fecha = new Date(`${y}-${m}-${d}`);
    return fecha >= desde && fecha <= hasta;
  });
}

// ---------------- EVENTOS ----------------
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("historico-modal");
  const btnOpen = document.getElementById("historico-btn");
  const btnClose = document.getElementById("historico-close");

  if (btnOpen && modal) {
    btnOpen.addEventListener("click", () => {
      modal.classList.add("open");
      cargarHistorico();
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener("click", () => {
      modal.classList.remove("open");
    });
  }

  // Botón últimos 3 meses
  const btn3m = document.getElementById("filtro-3m");
  if (btn3m) {
    btn3m.addEventListener("click", () => {
      if (!historicoDatos.length) return;

      // Usamos la última fecha disponible en el TXT
      const [d, m, y] = historicoDatos[0].fecha.split("-");
      const fechaMax = new Date(`${y}-${m}-${d}`);
      const fechaMin = new Date(fechaMax);
      fechaMin.setMonth(fechaMax.getMonth() - 3);

      renderHistorico(filtrarPorRango(fechaMin, fechaMax));
    });
  }

  // Botón último mes
  const btn1m = document.getElementById("filtro-1m");
  if (btn1m) {
    btn1m.addEventListener("click", () => {
      if (!historicoDatos.length) return;

      const [d, m, y] = historicoDatos[0].fecha.split("-");
      const fechaMax = new Date(`${y}-${m}-${d}`);
      const fechaMin = new Date(fechaMax);
      fechaMin.setMonth(fechaMax.getMonth() - 1);

      renderHistorico(filtrarPorRango(fechaMin, fechaMax));
    });
  }

  // Botón rango personalizado
  const btnRango = document.getElementById("filtro-rango");
  if (btnRango) {
    btnRango.addEventListener("click", () => {
      const desdeInput = document.getElementById("fecha-desde").value;
      const hastaInput = document.getElementById("fecha-hasta").value;

      if (desdeInput && hastaInput) {
        const [y1, m1, d1] = desdeInput.split("-");
        const [y2, m2, d2] = hastaInput.split("-");
        const desde = new Date(`${y1}-${m1}-${d1}`);
        const hasta = new Date(`${y2}-${m2}-${d2}`);

        renderHistorico(filtrarPorRango(desde, hasta));
      }
    });
  }
});
