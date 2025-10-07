// ===================
// Modal Histórico
// ===================
const historicoModal = document.getElementById("historico-modal");
const historicoBtn = document.getElementById("historico-btn");
const historicoClose = document.getElementById("historico-close");
const historicoBody = document.getElementById("historico-body");

// Filtros
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
    const resp = await fetch("precios2015.txt");
    const texto = await resp.text();

    const lineas = texto.split("\n").map(l => l.trim()).filter(l => l);
    let historico = [];
    let fechaActual = null;

    for (let linea of lineas) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        fechaActual = linea;
      } else if (fechaActual) {
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
// Leer precios actuales de la tabla principal
// ===================
function leerPreciosTablaPrincipal() {
  const filas = document.querySelectorAll("#tabla-precios tr");
  const hoy = new Date();
  const fechaHoy = hoy.toLocaleDateString("es-ES").replace(/\//g, "-");

  let nuevosDatos = [];

  filas.forEach((fila, i) => {
    if (i === 0) return;
    const celdas = fila.querySelectorAll("td");
    if (celdas.length === 2) {
      const tipo = celdas[0].innerText.trim();
      const precioStr = celdas[1].innerText.replace(/[^\d.,]/g, "").replace(",", ".");
      const precio = parseFloat(precioStr);
      if (!isNaN(precio)) {
        nuevosDatos.push({
          fecha: fechaHoy,
          tipo: tipo,
          precio: precio
        });
      }
    }
  });

  return nuevosDatos;
}

// ===================
// Guardar histórico actualizado (GitHub/Netlify → solo simulación local)
// ===================
async function guardarHistoricoEnArchivo() {
  console.log("💡 Entorno estático (GitHub/Netlify):");
  console.log("   La tabla se actualiza visualmente,");
  console.log("   pero el archivo precios2015.txt se sobrescribe mediante GitHub Actions.");
}

// ===================
// Integrar precios del día si no existen
// ===================
async function actualizarConDatosDelDia() {
  const nuevos = leerPreciosTablaPrincipal();
  if (nuevos.length === 0) return;

  const hoy = nuevos[0].fecha;
  const yaExiste = datosHistoricos.some(d => d.fecha === hoy);

  if (!yaExiste) {
    console.log("🟢 Añadiendo datos del día al histórico:", hoy);
    datosHistoricos = [...datosHistoricos, ...nuevos];
    datosHistoricos.sort((a, b) => {
      const [da, ma, ya] = a.fecha.split("-").map(Number);
      const [db, mb, yb] = b.fecha.split("-").map(Number);
      return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
    });

    await guardarHistoricoEnArchivo(); // Simula guardado (no rompe nada)
  }
}

// ===================
// Renderizar tabla
// ===================
function renderHistorico(filtrado) {
  historicoBody.innerHTML = "";

  const agrupado = {};
  filtrado.forEach(item => {
    if (!agrupado[item.fecha]) agrupado[item.fecha] = [];
    agrupado[item.fecha].push(item);
  });

  const fechas = Object.keys(agrupado).sort((a, b) => {
    const [da, ma, ya] = a.split("-").map(Number);
    const [db, mb, yb] = b.split("-").map(Number);
    return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
  });

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

filtro3m?.addEventListener("click", () => {
  const hoy = new Date();
  const hace3m = new Date();
  hace3m.setMonth(hoy.getMonth() - 3);
  renderHistorico(filtrarPorRango(hace3m, hoy));
});

filtro1m?.addEventListener("click", () => {
  const hoy = new Date();
  const hace1m = new Date();
  hace1m.setMonth(hoy.getMonth() - 1);
  renderHistorico(filtrarPorRango(hace1m, hoy));
});

filtroRango?.addEventListener("click", () => {
  const desdeVal = fechaDesdeInput.value;
  const hastaVal = fechaHastaInput.value;
  if (!desdeVal || !hastaVal) return;

  const [ay, am, ad] = desdeVal.split("-").map(Number);
  const [by, bm, bd] = hastaVal.split("-").map(Number);

  const desde = new Date(ay, am - 1, ad);
  const hasta = new Date(by, bm - 1, bd);

  renderHistorico(filtrarPorRango(desde, hasta));
});

// ===================
// Eventos modal
// ===================
if (historicoBtn) {
  historicoBtn.addEventListener("click", async () => {
    historicoModal.classList.add("open");
    if (datosHistoricos.length === 0) {
      datosHistoricos = await cargarHistorico();
    }
    await actualizarConDatosDelDia();
    renderHistorico(datosHistoricos);
  });
}

historicoClose?.addEventListener("click", () => {
  historicoModal.classList.remove("open");
});
