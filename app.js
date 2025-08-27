// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // { virgen_extra: 3.694, virgen: 3.369, lampante: 3.177 }
let HISTORICO = {};   // JSON histórico
let grafico = null;   // referencia al gráfico Chart.js

// ====== Utilidades ======
function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }

function normalizaPrecios(preciosRaw) {
  const map = {};
  const ve = preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg ?? null;
  const v  = preciosRaw['Aceite de oliva virgen']?.precio_eur_kg ?? null;
  const l  = preciosRaw['Aceite de oliva lampante']?.precio_eur_kg ?? null;

  if (ve && ve > 0 && ve < 20) map.virgen_extra = Number(ve);
  if (v  && v  > 0 && v  < 20) map.virgen       = Number(v);
  if (l  && l  > 0 && l  < 20) map.lampante     = Number(l);
  return map;
}

// ====== Tabla de precios principal ======
function renderTabla(preciosRaw) {
  const cont = document.getElementById('tabla-precios');
  if (!cont) return;

  const rows = [
    ['Aceite de oliva virgen extra', preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg],
    ['Aceite de oliva virgen',       preciosRaw['Aceite de oliva virgen']?.precio_eur_kg],
    ['Aceite de oliva lampante',     preciosRaw['Aceite de oliva lampante']?.precio_eur_kg],
  ];

  const cuerpo = rows.map(([label, val]) => {
    const precioTxt = (val && val > 0 && val < 20) ? euros(val) : '—';
    return `
      <tr>
        <td class="tipo" data-label="Tipo de aceite de oliva">${label}</td>
        <td class="precio" data-label="Precio €/kg">${precioTxt}</td>
      </tr>`;
  }).join('');

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
  const sel = document.getElementById('tipo');
  const precioEl = document.getElementById('precio');
  if (!sel || !precioEl) return;

  const key = sel.value; 
  const precio = PRECIOS_MAP[key];

  if (precio) {
    setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  } else if (key) {
    setTexto(precioEl, '— Precio no disponible —');
  } else {
    setTexto(precioEl, '');
  }
}

// ====== Calculadora ======
function calcular() {
  const sel = document.getElementById('tipo');
  const res = document.getElementById('resultado');
  const rEl = document.getElementById('rendimiento');
  if (!sel || !res || !rEl) return;

  const key = sel.value;
  const rendimiento = Number(rEl.value);
  const precio = PRECIOS_MAP[key];

  if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100) {
    res.classList.add('error');
    res.innerHTML = `
      <strong>Falta información:</strong> selecciona una calidad con precio disponible y
      escribe un rendimiento entre 0 y 100.
    `;
    return;
  }

  const precioAceituna = (rendimiento / 100) * precio;

  res.classList.remove('error');
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
          <td data-label="Precio aceituna (€/kg)"><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ====== Modal “De dónde obtenemos los precios” ======
function setupFuenteModal() {
  const link = document.getElementById('fuente-link');
  const modal = document.getElementById('fuente-modal');
  const cerrar = document.getElementById('modal-close');

  if (!link || !modal || !cerrar) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('open');
  });

  cerrar.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.remove('open');
  });
}

// ====== Render gráfico ======
function renderChart(tipo) {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  if (!canvas) return;

  const datos = HISTORICO[TIPO_LABEL[tipo]];
  if (!datos || datos.length === 0) {
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    if (grafico) { grafico.destroy(); grafico = null; }
    return;
  }

  if (msg) msg.textContent = '';

  const labels = datos.map(d => d.fecha);
  const valores = datos.map(d => d.precio_eur_kg);

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: TIPO_LABEL[tipo],
        data: valores,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.1)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: 'Fecha' } },
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// ====== Carga de datos ======
async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    // JSON precios actuales
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // JSON histórico
    try {
      const resHist = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) HISTORICO = await resHist.json();
    } catch { HISTORICO = {}; }

    // Fecha legible
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {/* noop */}

    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    renderTabla(datos.precios || {});

    // Normalizar selector
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    actualizarPrecioSeleccion();
    calcular();

    // Listener calculadora
    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    // Listener gráfico
    const selGraf = document.getElementById('grafico-tipo');
    selGraf?.addEventListener('change', () => renderChart(selGraf.value));
    if (selGraf) renderChart(selGraf.value);

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});
