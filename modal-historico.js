// =======================
// modal-historico.js
// =======================

const historicoModal = document.getElementById("historico-modal");
const historicoBtn = document.getElementById("historico-btn");
const historicoClose = document.getElementById("historico-close");
const historicoBody = document.getElementById("historico-body");

let historicoDatos = [];

// Abrir modal
historicoBtn.addEventListener("click", async () => {
  historicoModal.classList.add("open");

  if (historicoDatos.length === 0) {
    try {
      const resp = await fetch("precios2015.txt");
      const text = await resp.text();
      historicoDatos = parseHistorico(text);
      renderHistorico(historicoDatos);
    } catch (err) {
      console.error("Error cargando histórico:", err);
    }
  } else {
    renderHistorico(historicoDatos);
  }
});

// Cerrar modal
historicoClose.addEventListener("click", () => {
  historicoModal.classList.remove("open");
});

// Parsear datos del TXT
function parseHistorico(text) {
  const lineas = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const datos = [];
  let fechaActual = null;

  lineas.forEach(linea => {
    if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
      fechaActual = linea;
    } else if (fechaActual) {
      const partes = linea.split(" ");
      const precio = partes.pop();
      const tipo = partes.join(" ");
      datos.push({
        fecha: fechaActual,
        tipo,
        precio
      });
    }
  });

  return datos;
}

// Renderizar tabla
function renderHistorico(datos) {
  historicoBody.innerHTML = "";

  let ultimaFecha = null;
  datos.forEach(item => {
    if (item.fecha !== ultimaFecha) {
      const filaFecha = document.createElement("tr");
      filaFecha.innerHTML = `<td colspan="3" class="fecha-barra"><strong>${item.fecha}</strong></td>`;
      historicoBody.appendChild(filaFecha);
      ultimaFecha = item.fecha;
    }

    const fila = document.createElement("tr");
    fila.classList.add("sub-row");
    fila.innerHTML = `
      <td></td>
      <td class="tipo">${item.tipo}</td>
      <td class="precio">${item.precio}</td>
    `;
    historicoBody.appendChild(fila);
  });
}

// Filtrar por rango
function filtrarPorRango(desde, hasta) {
  return historicoDatos.filter(item => {
    const fechaParts = item.fecha.split("-"); // DD-MM-YYYY
    const fecha = new Date(`${fechaParts[2]}-${fechaParts[1]}-${fechaParts[0]}`);
    return fecha >= desde && fecha <= hasta;
  });
}

// Botón últimos 3 meses
document.getElementById("filtro-3m").addEventListener("click", () => {
  const hoy = new Date();
  const desde = new Date();
  desde.setMonth(hoy.getMonth() - 3);
  renderHistorico(filtrarPorRango(desde, hoy));
});

// Botón último mes
document.getElementById("filtro-1m").addEventListener("click", () => {
  const hoy = new Date();
  const desde = new Date();
  desde.setMonth(hoy.getMonth() - 1);
  renderHistorico(filtrarPorRango(desde, hoy));
});

// Botón rango personalizado
document.getElementById("filtro-rango").addEventListener("click", () => {
  const desdeInput = document.getElementById("fecha-desde").value;
  const hastaInput = document.getElementById("fecha-hasta").value;

  if (desdeInput && hastaInput) {
    const [d1, m1, y1] = desdeInput.split("-");
    const [d2, m2, y2] = hastaInput.split("-");
    const desde = new Date(`${y1}-${m1}-${d1}`);
    const hasta = new Date(`${y2}-${m2}-${d2}`);

    renderHistorico(filtrarPorRango(desde, hasta));
  }
});
