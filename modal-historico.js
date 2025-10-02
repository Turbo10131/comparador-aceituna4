// ===================
// Modal Histórico
// ===================
const historicoModal = document.getElementById("historico-modal");
const historicoBtn = document.getElementById("historico-btn");
const historicoClose = document.getElementById("historico-close");
const historicoBody = document.getElementById("historico-body");

// Filtros (🔹 IDs corregidos)
const filtro3m = document.getElementById("btn-3m");
const filtro1m = document.getElementById("btn-1m");
const filtroRango = document.getElementById("btn-filtrar");
const fechaDesdeInput = document.getElementById("fecha-desde");
const fechaHastaInput = document.getElementById("fecha-hasta");

let datosHistoricos = [];

// ===================
// Leer precios2015.txt
// ===================
async function cargarHistorico() {
  try {
    const resp = await fetch("precios2015.txt"); // 🔹 nombre correcto
    const texto = await resp.text();

    const lineas = texto.split("\n").map(l => l.trim()).filter(l => l);
    let historico = [];
    let fechaActual = null;

    for (let linea of lineas) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        // Si la línea es una fecha (dd-mm-yyyy)
        fechaActual = linea;
      } else if (fechaActual) {
        // Si es un precio
        const partes = linea.split(" ");
        const tipo = partes.slice(0, -1).join(" ");
        const precio = parseFloat(partes[partes.length - 1].replace(",", "."));
        historico.push({
          fecha: fechaActual,
          tipo: tipo,
          precio: precio
        });
      }
    }

    return historico;
  } catch (e) {
    console.error("Error cargando histórico:", e);
    return [];
  }
}

// ===================
// Renderizar tabla
// ===================
function renderHistorico(filtrado) {
  historicoBody.innerHTML = "";

  // Agrupar por fecha
  const agrupado = {};
  filtrado.forEach(item => {
    if (!agrupado[item.fecha]) agrupado[item.fecha] = [];
    agrupado[item.fecha].push(item);
  });

  // Ordenar fechas descendente
  const fechas = Object.keys(agrupado).sort((a, b) => {
    const [da, ma, ya] = a.split("-").map(Number);
    const [db, mb, yb] = b.split("-").map(Number);
    return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
  });

  // Pintar filas
  fechas.forEach(fecha => {
    const filaFecha = document.createElement("tr");
    filaFecha.innerHTML = `<td colspan="3" class="fecha-barra"><strong>${fecha}</strong></td>`;
    historicoBody.appendChild(filaFecha);

    agrupado[fecha].forEach(p => {
      const fila = document.createElement("tr");
      fila.classList.add("sub-row");
      fila.innerHTML = `
        <td></td>
        <td class="tipo">${p.tipo}</td>
        <td class="precio">${p.precio.toFixed(3)} €/kg</td>
      `;
      historicoBody.appendChild(fila);
    });
  });
}

// ===================
// Filtros
// ===================
function filtrarPorRango(desde, hasta) {
  return datosHistoricos.filter(item => {
    const [d, m, y] = item.fecha.split("-").map(Number);
    const fechaItem = new Date(y, m - 1, d);
    return fechaItem >= desde && fechaItem <= hasta;
  });
}

if (filtro3m) {
  filtro3m.addEventListener("click", () => {
    const hoy = new Date();
    const hace3m = new Date();
    hace3m.setMonth(hoy.getMonth() - 3);
    renderHistorico(filtrarPorRango(hace3m, hoy));
  });
}

if (filtro1m) {
  filtro1m.addEventListener("click", () => {
    const hoy = new Date();
    const hace1m = new Date();
    hace1m.setMonth(hoy.getMonth() - 1);
    renderHistorico(filtrarPorRango(hace1m, hoy));
  });
}

if (filtroRango) {
  filtroRango.addEventListener("click", () => {
    const desdeVal = fechaDesdeInput.value;
    const hastaVal = fechaHastaInput.value;
    if (!desdeVal || !hastaVal) return;

    const [ay, am, ad] = desdeVal.split("-").map(Number);
    const [by, bm, bd] = hastaVal.split("-").map(Number);

    const desde = new Date(ay, am - 1, ad);
    const hasta = new Date(by, bm - 1, bd);

    renderHistorico(filtrarPorRango(desde, hasta));
  });
}

// ===================
// Eventos modal
// ===================
if (historicoBtn) {
  historicoBtn.addEventListener("click", async () => {
    historicoModal.classList.add("open");
    if (datosHistoricos.length === 0) {
      datosHistoricos = await cargarHistorico();
    }
    renderHistorico(datosHistoricos); // 🔹 siempre renderiza todos los datos
  });
}

if (historicoClose) {
  historicoClose.addEventListener("click", () => {
    historicoModal.classList.remove("open");
  });
}
