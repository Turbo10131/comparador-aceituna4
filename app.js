// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // { virgen_extra: 3.694, virgen: 3.369, lampante: 3.177 }
let HISTORICO = {};   // JSON histórico completo (todas las fechas)
let grafico = null;   // instancia Chart.js

// Estado de la gráfica
let chartMode = 'years';  // 'years' | 'months' | 'days'
let yearFilter = 'all';   // 'all' | 2012..2025

// ====== Utilidades ======
function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n)        { return `${Number(n).toFixed(3)} €/kg`; }

// Normaliza JSON de precios actuales
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

  cerrar.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

// ====== AÑOS disponibles (union de categorías) ======
function aniosDisponibles() {
  const set = new Set();
  ['Aceite de oliva virgen extra','Aceite de oliva virgen','Aceite de oliva lampante'].forEach(cat => {
    (HISTORICO[cat] || []).forEach(d => {
      const y = new Date(d.fecha).getFullYear();
      if (!isNaN(y)) set.add(y);
    });
  });
  return Array.from(set).sort((a,b) => a - b); // ascendente
}

function poblarSelectorAnios() {
  const sel = document.getElementById('grafico-anio');
  if (!sel) return;
  const prev = sel.value;
  const anios = aniosDisponibles();

  sel.innerHTML = '<option value="all">Todos los años</option>' +
    anios.map(y => `<option value="${y}">${y}</option>`).join('');

  // si el valor anterior sigue existiendo, recupéralo; si no, deja "all"
  sel.value = (prev && anios.includes(Number(prev))) ? prev : 'all';
}

// ====== Helpers de agregación ======
function agruparPorAnio(registros) {
  // Media por año
  const map = new Map();
  registros.forEach(r => {
    const y = new Date(r.fecha).getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(r.precio_eur_kg);
  });
  const labels = Array.from(map.keys()).sort((a,b)=>a-b);
  const values = labels.map(y => {
    const arr = map.get(y);
    return arr.reduce((s,n)=>s+n,0)/arr.length;
  });
  return { labels, values };
}

function filtrarPorAnio(registros, y) {
  return registros.filter(r => new Date(r.fecha).getFullYear() === y);
}

// ====== Render gráfico ======
function renderChart() {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  const selTipo = document.getElementById('grafico-tipo');
  const selAnio = document.getElementById('grafico-anio');
  if (!canvas || !selTipo) return;

  const tipoKey = selTipo.value; // virgen_extra | virgen | lampante
  const cat = TIPO_LABEL[tipoKey];
  const serie = (HISTORICO[cat] || []).slice(); // copia

  if (!serie.length) {
    if (grafico) { grafico.destroy(); grafico = null; }
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    return;
  }
  if (msg) msg.textContent = '';

  // Asegurar selector de años actualizado
  poblarSelectorAnios();

  // Leer filtro de año
  yearFilter = selAnio ? selAnio.value : 'all';

  let labels = [];
  let valores = [];

  if (chartMode === 'years') {
    const { labels: L, values: V } = agruparPorAnio(serie);
    labels = L;
    valores = V;
  } else {
    // months / days: trabajamos con un año concreto. Si "all", cogemos el último disponible
    let y = yearFilter;
    if (y === 'all') {
      const anios = aniosDisponibles();
      if (anios.length) y = anios[anios.length - 1]; // último año
    } else {
      y = Number(y);
    }

    const porAnio = filtrarPorAnio(serie, Number(y));
    // Orden por fecha
    porAnio.sort((a,b)=> (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    labels = porAnio.map(d => d.fecha);
    valores = porAnio.map(d => d.precio_eur_kg);
  }

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: TIPO_LABEL[tipoKey],
        data: valores,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.1)',
        fill: true,
        tension: 0.2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: chartMode === 'years' ? 'Año' : (chartMode === 'months' ? 'Mes' : 'Día')
          },
          ticks: { maxRotation: 0, autoSkip: true }
        },
        y: {
          title: { display: true, text: '€/kg' }
        }
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

    // JSON histórico (completo)
    try {
      const resHist = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) HISTORICO = await resHist.json();
      else HISTORICO = {};
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

    // Normalizar selector (calculadora)
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    actualizarPrecioSeleccion();
    calcular();

    // Listeners calculadora
    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    // ====== Gráfica ======
    const selGrafTipo = document.getElementById('grafico-tipo');
    const selGrafAnio = document.getElementById('grafico-anio');
    const btnAnios    = document.getElementById('btn-anios');
    const btnMeses    = document.getElementById('btn-meses');
    const btnDias     = document.getElementById('btn-dias');

    // Valores por defecto
    if (selGrafTipo && !selGrafTipo.value) selGrafTipo.value = 'virgen_extra';
    poblarSelectorAnios();

    // Render inicial
    renderChart();

    // Listeners de filtros / modo
    selGrafTipo?.addEventListener('change', renderChart);
    selGrafAnio?.addEventListener('change', () => { yearFilter = selGrafAnio.value; renderChart(); });

    btnAnios?.addEventListener('click', () => { chartMode = 'years';  renderChart(); });
    btnMeses?.addEventListener('click', () => { chartMode = 'months'; renderChart(); });
    btnDias ?.addEventListener('click', () => { chartMode = 'days';   renderChart(); });

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
