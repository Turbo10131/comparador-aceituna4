// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // { virgen_extra: n, virgen: n, lampante: n }
let HISTORICO   = {}; // { 'Aceite de oliva virgen extra': [{fecha, precio_eur_kg}, ...], ... }
let grafico     = null;
let MODO_GRAFICO = 'meses'; // 'anios' | 'meses' | 'dias'

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

function parseDateStr(dstr) { // 'YYYY-MM-DD' -> Date
  const [y,m,d] = dstr.split('-').map(Number);
  return new Date(Date.UTC(y, m-1, d));
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
  const link   = document.getElementById('fuente-link');
  const modal  = document.getElementById('fuente-modal');
  const cerrar = document.getElementById('modal-close');
  if (!link || !modal || !cerrar) return;

  link.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('open'); });
  cerrar.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

// ====== Datos para la gráfica ======
function getSerie(tipoKey) {
  const etiqueta = TIPO_LABEL[tipoKey];
  const arr = (HISTORICO[etiqueta] || []).slice();
  arr.sort((a,b) => parseDateStr(a.fecha) - parseDateStr(b.fecha));
  return arr;
}

function agruparPorAnio(arr) {
  const tmp = new Map(); // year -> [precios...]
  arr.forEach(d => {
    const y = parseDateStr(d.fecha).getUTCFullYear();
    if (!tmp.has(y)) tmp.set(y, []);
    tmp.get(y).push(Number(d.precio_eur_kg));
  });
  const years = Array.from(tmp.keys()).sort((a,b)=>a-b);
  const vals  = years.map(y => {
    const v = tmp.get(y);
    return v.reduce((s,n)=>s+n,0) / v.length;
  });
  return { labels: years.map(String), values: vals, xTitle: 'Año' };
}

function agruparPorMes(arr, year) {
  const tmp = new Map(); // month(1..12) -> [precios]
  arr.forEach(d => {
    const dt = parseDateStr(d.fecha);
    const y = dt.getUTCFullYear();
    if (y !== year) return;
    const m = dt.getUTCMonth()+1;
    if (!tmp.has(m)) tmp.set(m, []);
    tmp.get(m).push(Number(d.precio_eur_kg));
  });
  const months = Array.from(tmp.keys()).sort((a,b)=>a-b);
  const vals   = months.map(m => {
    const v = tmp.get(m); return v.reduce((s,n)=>s+n,0) / v.length;
  });
  const labels = months.map(m => String(m).padStart(2,'0'));
  return { labels, values: vals, xTitle: 'Mes' };
}

function porDia(arr, year) {
  const f = arr.filter(d => parseDateStr(d.fecha).getUTCFullYear() === year);
  if (f.length === 0) return { labels: [], values: [], xTitle: 'Día' };
  const labels = f.map(d => d.fecha);
  const values = f.map(d => Number(d.precio_eur_kg));
  return { labels, values, xTitle: 'Día' };
}

// ====== Rellenar selector de años ======
function poblarSelectorAnios() {
  const selAnio = document.getElementById('grafico-anio');
  if (!selAnio) return;

  let anios = new Set();
  Object.values(HISTORICO).forEach(lista => {
    lista.forEach(d => anios.add(parseDateStr(d.fecha).getUTCFullYear()));
  });

  anios = Array.from(anios).sort((a,b)=>a-b);
  selAnio.innerHTML = `<option value="all">Todos los años</option>`;
  anios.forEach(y => {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    selAnio.appendChild(opt);
  });

  // Por comodidad: selecciona el último año si la vista no es "Años"
  const ultimo = anios[anios.length-1];
  if (MODO_GRAFICO !== 'anios' && ultimo) selAnio.value = String(ultimo);
}

// ====== Render gráfico ======
function renderChart() {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  const selTipo = document.getElementById('grafico-tipo');
  const selAnio = document.getElementById('grafico-anio');
  if (!canvas || !selTipo || !selAnio) return;

  const tipo = selTipo.value;
  const serie = getSerie(tipo);
  let labels = [], values = [], xTitle = '';

  // Decidir año para meses/días
  let yearSel = selAnio.value === 'all' ? null : Number(selAnio.value);
  if ((MODO_GRAFICO === 'meses' || MODO_GRAFICO === 'dias') && !yearSel) {
    // si no hay año seleccionado, tomar el más reciente existente
    const years = [...new Set(serie.map(d => parseDateStr(d.fecha).getUTCFullYear()))].sort((a,b)=>a-b);
    yearSel = years[years.length-1];
    selAnio.value = String(yearSel);
  }

  if (MODO_GRAFICO === 'anios') {
    const a = agruparPorAnio(serie);
    labels = a.labels; values = a.values; xTitle = a.xTitle;
  } else if (MODO_GRAFICO === 'meses') {
    const a = agruparPorMes(serie, yearSel);
    labels = a.labels; values = a.values; xTitle = `${a.xTitle} (${yearSel})`;
  } else { // 'dias'
    const a = porDia(serie, yearSel);
    labels = a.labels; values = a.values; xTitle = `${a.xTitle} (${yearSel})`;
  }

  if (!labels.length) {
    if (grafico) { grafico.destroy(); grafico = null; }
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    return;
  }
  if (msg) msg.textContent = '';

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: TIPO_LABEL[tipo],
        data: values,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.12)',
        fill: true,
        tension: 0.2,
        pointRadius: 2.8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: xTitle } },
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// ====== Botones de vista ======
function activarBotonVista(id) {
  ['btn-anios','btn-meses','btn-dias'].forEach(btnId => {
    const b = document.getElementById(btnId);
    if (!b) return;
    const isActive = (btnId === id);
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
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
    poblarSelectorAnios();
    renderChart();

    // cambios de controles de la gráfica
    document.getElementById('grafico-tipo')?.addEventListener('change', renderChart);
    document.getElementById('grafico-anio')?.addEventListener('change', renderChart);

    document.getElementById('btn-anios')?.addEventListener('click', () => {
      MODO_GRAFICO = 'anios'; activarBotonVista('btn-anios');
      document.getElementById('grafico-anio').value = 'all';
      renderChart();
    });
    document.getElementById('btn-meses')?.addEventListener('click', () => {
      MODO_GRAFICO = 'meses'; activarBotonVista('btn-meses'); renderChart();
    });
    document.getElementById('btn-dias')?.addEventListener('click', () => {
      MODO_GRAFICO = 'dias'; activarBotonVista('btn-dias'); renderChart();
    });

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');

    const tabla = document.getElementById('tabla-precios');
    if (tabla) tabla.innerHTML = '';
    const res = document.getElementById('resultado');
    if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }

    const msg = document.getElementById('grafico-msg');
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});
