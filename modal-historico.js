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
      // Si la línea es una fecha (formato DD-MM-YYYY)
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        fechaActual = linea;
      } 
      // Si es un precio de aceite
      else if (fechaActual) {
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

    // Guardamos TODOS los registros desde 2015
    historicoDatos = registros.sort((a, b) => {
      const [d1, m1, y1] = a.fecha.split("-");
      const [d2, m2, y2] = b.fecha.split("-");
      return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
    });

    // Renderizamos TODO el histórico al inicio
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

/* ---------------- Filtros ---------------- */

// Últimos 3 meses
document.getElementById("filtro-3m")?.addEventListener("click", () => {
  const hoy = new Date();
  const hace3m = new Date();
  hace3m.setMonth(hoy.getMonth() - 3);

  const filtrados = historicoDatos.filter(reg => {
    const [d, m, y] = reg.fecha.split("-");
    const fecha = new Date(`${y}-${m}-${d}`);
    return fecha >= hace3m && fecha <= hoy;
  });

  renderHistorico(filtrados);
});

// Último mes
document.getElementById("filtro-1m")?.addEventListener("click", () => {
  const hoy = new Date();
  const hace1m = new Date();
  hace1m.setMonth(hoy.getMonth() - 1);

  const filtrados = historicoDatos.filter(reg => {
    const [d, m, y] = reg.fecha.split("-");
    const fecha = new Date(`${y}-${m}-${d}`);
    return fecha >= hace1m && fecha <= hoy;
  });

  renderHistorico(filtrados);
});

// Filtrar rango
document.getElementById("filtro-rango")?.addEventListener("click", () => {
  const desdeInput = document.getElementById("fecha-desde").value;
  const hastaInput = document.getElementById("fecha-hasta").value;

  if (!desdeInput || !hastaInput) return;

  const [desdeY, desdeM, desdeD] = desdeInput.split("-");
  const [hastaY, hastaM, hastaD] = hastaInput.split("-");

  const desde = new Date(`${desdeY}-${desdeM}-${desdeD}`);
  const hasta = new Date(`${hastaY}-${hastaM}-${hastaD}`);

  const filtrados = historicoDatos.filter(reg => {
    const [d, m, y] = reg.fecha.split("-");
    const fecha = new Date(`${y}-${m}-${d}`);
    return fecha >= desde && fecha <= hasta;
  });

  renderHistorico(filtrados);
});

/* ---------------- Modal abrir/cerrar ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  cargarHistorico();

  const modal = document.getElementById("historico-modal");
  const btnOpen = document.getElementById("historico-btn");
  const btnClose = document.getElementById("historico-close");

  if (btnOpen && modal) {
    btnOpen.addEventListener("click", () => {
      modal.classList.add("open");
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener("click", () => {
      modal.classList.remove("open");
    });
  }
});
