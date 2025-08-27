// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: "Aceite de oliva virgen extra",
  virgen: "Aceite de oliva virgen",
  lampante: "Aceite de oliva lampante",
};

let PRECIOS_MAP = {}; // { virgen_extra: 3.694, virgen: 3.369, lampante: 3.177 }
let chartInstance = null; // instancia Chart.js para poder destruir/recargar

// ====== Utilidades ======
function setTexto(el, txt) {
  if (el) el.textContent = txt;
}
function euros(n) {
  return `${Number(n).toFixed(3)} €/kg`;
}
function getEl(id) {
  return document.getElementById(id);
}

// ====== Normalizar precios actuales (del JSON diario) ======
function normalizaPrecios(preciosRaw) {
  const map = {};
  const ve = preciosRaw["Aceite de oliva virgen extra"]?.precio_eur_kg ?? null;
  const v = preciosRaw["Aceite de oliva virgen"]?.precio_eur_kg ?? null;
  const l = preciosRaw["Aceite de oliva lampante"]?.precio_eur_kg ?? null;

  if (ve && ve > 0 && ve < 20) map.virgen_extra = Number(ve);
  if (v && v > 0 && v < 20) map.virgen = Number(v);
  if (l && l > 0 && l < 20) map.lampante = Number(l);
  return map;
}

// ====== Tabla de precios principal ======
function renderTabla(preciosRaw) {
  const cont = getEl("tabla-precios");
  if (!cont) return;

  const rows = [
    [
      "Aceite de oliva virgen extra",
      preciosRaw["Aceite de oliva virgen extra"]?.precio_eur_kg,
    ],
    ["Aceite de oliva virgen", preciosRaw["Aceite de oliva virgen"]?.precio_eur_kg],
    [
      "Aceite de oliva lampante",
      preciosRaw["Aceite de oliva lampante"]?.precio_eur_kg,
    ],
  ];

  const cuerpo = rows
    .map(([label, val]) => {
      const precioTxt = val && val > 0 && val < 20 ? euros(val) : "—";
      return `
      <tr>
        <td class="tipo" data-label="Tipo de aceite de oliva">${label}</td>
        <td class="precio" data-label="Precio €/kg">${precioTxt}</td>
      </tr>`;
    })
    .join("");

  cont.innerHTML = `
    <table class="price-table">
      <thead>
        <tr>
          <th>Tipo de aceite de oliva</th>
          <th>Precio €/kg</th>
        </tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table>
  `;
}

// ====== Precio seleccionado (debajo del selector) ======
function actualizarPrecioSeleccion() {
  const sel = getEl("tipo");
  const precioEl = getEl("precio");
  if (!sel || !precioEl) return;

  const key = sel.value; // virgen_extra | virgen | lampante | ""
  const precio = PRECIOS_MAP[key];

  if (precio) {
    setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  } else if (key) {
    setTexto(precioEl, "— Precio no disponible —");
  } else {
    setTexto(precioEl, "");
  }
}

// ====== Calculadora (tabla 4 columnas) ======
function calcular() {
  const sel = getEl("tipo");
  const res = getEl("resultado");
  const rEl = getEl("rendimiento");
  if (!sel || !res || !rEl) return;

  const key = sel.value;
  const rendimiento = Number(rEl.value);
  const precio = PRECIOS_MAP[key];

  if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100) {
    res.classList.add("error");
    res.innerHTML = `
      <strong>Falta información:</strong> selecciona una calidad con precio disponible y
      escribe un rendimiento entre 0 y 100.
    `;
    return;
  }

  const precioAceituna = (rendimiento / 100) * precio;

  res.classList.remove("error");
  res.innerHTML = `
    <table class="calc-table">
      <thead>
        <tr>
          <th>Rendimiento (%)</th>
          <th>Calidad del Aceite</th>
          <th>Precio del Aceite</th>
          <th>Precio aceituna (€/kg)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Rendimiento (%)">${rendimiento}%</td>
          <td data-label="Calidad del Aceite">${TIPO_LABEL[key]}</td>
          <td data-label="Precio del Aceite">${precio.toFixed(3)} €/kg</td>
          <td data-label="Precio aceituna (€/kg)"><strong>${precioAceituna.toFixed(
            3
          )} €/kg</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ====== Modal “De dónde obtenemos los precios” ======
function setupFuenteModal() {
  const link = getEl("fuente-link");
  const modal = getEl("fuente-modal");
  const closeBtn = getEl("modal-close");

  if (!link || !modal || !closeBtn) return;

  const open = () => modal.classList.add("open");
  const close = () => modal.classList.remove("open");

  link.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
}

// ====== Gráfica (Chart.js) ======
function renderChartFor(labels, data, datasetLabel) {
  const canvas = getEl("grafico-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Si no hay Chart cargado, mostramos un fallback simple en el canvas
  if (typeof window.Chart === "undefined") {
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "#666";
      ctx.fillText("No se pudo cargar la librería de gráficos.", 10, 40);
    }
    return;
  }

  // Si ya había una instancia, destruirla para recrear
  if (chartInstance) chartInstance.destroy();

  if (!labels || labels.length === 0) {
    // Dibujo un mensaje en el canvas si no hay datos
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#666";
    ctx.fillText("No hay datos históricos para mostrar.", 10, 40);
    return;
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data,
          borderWidth: 2,
          // no definimos colores específicos en línea base por si cambian estilos;
          // si quieres forzar, puedes descomentar estas dos líneas:
          borderColor: "#1f6feb",
          backgroundColor: "rgba(31,111,235,.15)",
          fill: true,
          pointRadius: 2.5,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          title: { display: true, text: "Fecha" },
          ticks: { maxRotation: 0, autoSkip: true },
        },
        y: {
          title: { display: true, text: "€/kg" },
          beginAtZero: false,
        },
      },
    },
  });
}

async function cargarHistorico() {
  const sel = getEl("grafico-tipo");
  if (!sel) return;

  try {
    const res = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const historico = await res.json();

    // Mapeo de clave (selector) -> etiqueta del JSON histórico
    const MAPEO = {
      virgen_extra: "Aceite de oliva virgen extra",
      virgen: "Aceite de oliva virgen",
      lampante: "Aceite de oliva lampante",
    };

    const key = sel.value;
    const etiqueta = MAPEO[key];
    const arr = historico[etiqueta] || [];

    if (!Array.isArray(arr) || arr.length === 0) {
      renderChartFor([], [], TIPO_LABEL[key]);
      return;
    }

    // labels y valores
    const labels = arr.map((p) => p.fecha);
    const values = arr.map((p) => p.precio_eur_kg);

    renderChartFor(labels, values, TIPO_LABEL[key]);
  } catch (err) {
    console.error("[cargarHistorico] Error:", err);
    // fallback: mostrar mensaje en el canvas
    renderChartFor([], [], "");
  }
}

function setupGrafico() {
  const sel = getEl("grafico-tipo");
  if (!sel) return;
  sel.addEventListener("change", cargarHistorico);
  cargarHistorico(); // primera carga
}

// ====== Carga de datos del día ======
async function cargarDatos() {
  const fechaEl = getEl("fecha"); // puede no existir
  const precioEl = getEl("precio");
  const tablaInfoEl = getEl("tabla-info");

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Fecha legible (misma para rótulo de la tabla)
    let fechaTxt = datos.fecha || "desconocida";
    try {
      const f = new Date(
        datos.ultima_actualizacion || datos.generated_at || datos.fecha
      );
      if (!isNaN(f)) fechaTxt = f.toLocaleString("es-ES");
    } catch {
      /* noop */
    }

    // Si existe #fecha en la cabecera, lo actualizamos (tu HTML puede no tenerlo ya)
    setTexto(fechaEl, fechaTxt);
    // Rótulo encima de la tabla
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // Tabla de precios
    renderTabla(datos.precios || {});

    // Normaliza a nuestro selector y autoselecciona
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = getEl("tipo");
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = "virgen_extra";
      else if (PRECIOS_MAP.virgen) sel.value = "virgen";
      else if (PRECIOS_MAP.lampante) sel.value = "lampante";
    }

    // Pintar precio y cálculo inicial
    actualizarPrecioSeleccion();
    calcular();

    // Listeners calculadora
    sel?.addEventListener("change", () => {
      actualizarPrecioSeleccion();
      calcular();
    });
    getEl("rendimiento")?.addEventListener("input", calcular);
  } catch (err) {
    console.error("[cargarDatos] Error:", err);
    setTexto(fechaEl, "Error cargando datos");
    setTexto(precioEl, "No se pudieron cargar los precios.");
    setTexto(tablaInfoEl, "Precios actualizados — (error al cargar)");

    const tabla = getEl("tabla-precios");
    if (tabla) tabla.innerHTML = "";

    const res = getEl("resultado");
    if (res) {
      res.classList.add("error");
      res.textContent = "No se pudo calcular.";
    }
  }
}

// ====== Inicio ======
document.addEventListener("DOMContentLoaded", () => {
  setupFuenteModal(); // modal “De dónde obtenemos los precios”
  cargarDatos(); // datos del día (tabla + calculadora)
  setupGrafico(); // histórico (gráfica)
});
