// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // { virgen_extra: 3.694, virgen: 3.369, lampante: 3.177 }
let HISTORICO   = {}; // { 'Aceite de oliva virgen extra': [{fecha, precio_eur_kg}, ...], ... }
let grafico     = null;   // instancia de Chart.js
let G_MODO      = 'years'; // 'years' | 'months' | 'days'

// ====== Utilidades ======
function qs(id) { return document.getElementById(id); }
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
  const cont = qs('tabla-precios');
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
  const sel = qs('tipo');
  const precioEl = qs('precio');
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
  const sel = qs('tipo');
  const res = qs('resultado');
  const rEl = qs('rendimiento');
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
  const link = qs('fuente-link');
  const modal = qs('fuente-modal');
  const cerrar = qs('modal-close');

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

// --------- Parseo de historico.txt (texto grande) ----------
function parseHistoricoTexto(txt) {
  const lineas = txt.split(/\r?\n/);
  const precioRe = /(Aceite de oliva virgen extra|Aceite de oliva virgen|Aceite de oliva lampante)[^0-9]*([\d.,]+)\s*€/i;

  HISTORICO = {
    'Aceite de oliva virgen extra': [],
    'Aceite de oliva virgen': [],
    'Aceite de oliva lampante': [],
  };

  let pendientes = [];
  for (const raw of lineas) {
    const linea = raw.trim();
    if (!linea) continue;

    const mp = linea.match(precioRe);
    if (mp) {
      const tipo = mp[1];
      const val = parseFloat(String(mp[2]).replace(',', '.'));
      if (!isNaN(val) && val > 0 && val < 20) pendientes.push({ tipo, valor: val });
      continue;
    }

    // Formatos de fecha: dd-mm-aaaa o d-m-aa (también permite "/")
    let fechaIso = null;
    const parts = linea.split(/[-/]/);
    if (parts.length === 3) {
      let [dd, mm, aa] = parts;
      if (aa.length === 2) { // ej: 25 -> 2025
        aa = '20' + aa;
      }
      if (/^\d{4}$/.test(aa)) {
        const d = String(dd).padStart(2,'0');
        const m = String(mm).padStart(2,'0');
        fechaIso = `${aa}-${m}-${d}`;
      }
    }

    if (fechaIso && pendientes.length) {
      for (const p of pendientes) {
        HISTORICO[p.tipo].push({ fecha: fechaIso, precio_eur_kg: p.valor });
      }
      pendientes = [];
    }
  }

  // ordenar por fecha
  for (const k of Object.keys(HISTORICO)) {
    HISTORICO[k].sort((a,b) => a.fecha.localeCompare(b.fecha));
  }
}

// --------- Util: obtener min/max año del histórico ----------
function getMinMaxYear() {
  let min = Infinity, max = -Infinity;
  for (const k of Object.keys(HISTORICO)) {
    for (const d of HISTORICO[k]) {
      const y = parseInt(d.fecha.slice(0,4));
      if (!isNaN(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    }
  }
  if (!isFinite(min)) { min = 2012; max = new Date().getFullYear(); }
  return { min, max };
}

// ====== Helpers para agrupar datos ======
function groupByYear(datos) {
  const map = new Map(); // year -> {sum, count}
  datos.forEach(d => {
    const y = d.fecha.slice(0,4);
    const prev = map.get(y) || { sum:0, count:0 };
    prev.sum += d.precio_eur_kg;
    prev.count += 1;
    map.set(y, prev);
  });
  const years = Array.from(map.keys()).sort();
  const values = years.map(y => map.get(y).sum / map.get(y).count);
  return { labels: years, values };
}

function groupByMonthInYear(datos, year) {
  const map = new Map(); // '01'..'12' -> {sum,count}
  datos.forEach(d => {
    if (d.fecha.slice(0,4) !== String(year)) return;
    const m = d.fecha.slice(5,7);
    const prev = map.get(m) || { sum:0, count:0 };
    prev.sum += d.precio_eur_kg;
    prev.count += 1;
    map.set(m, prev);
  });
  const months = Array.from({length:12}, (_,i)=> String(i+1).padStart(2,'0'));
  const labels = months;
  const values = months.map(m => map.has(m) ? (map.get(m).sum/map.get(m).count) : null);
  return { labels, values };
}

function dailyInYear(datos, year) {
  const arr = datos.filter(d => d.fecha.slice(0,4) === String(year));
  arr.sort((a,b)=> a.fecha.localeCompare(b.fecha));
  return {
    labels: arr.map(d => d.fecha),
    values: arr.map(d => d.precio_eur_kg)
  };
}

function lastNDays(datos, n=60) {
  const arr = [...datos].sort((a,b)=> a.fecha.localeCompare(b.fecha));
  const slice = arr.slice(-n);
  return {
    labels: slice.map(d => d.fecha),
    values: slice.map(d => d.precio_eur_kg)
  };
}

// ====== Rellenar selector de años ======
function populateYearSelect() {
  const selAno = qs('grafico-anio');
  if (!selAno) return;
  selAno.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = 'all';
  optAll.textContent = 'Todos los años';
  selAno.appendChild(optAll);

  const {min, max} = getMinMaxYear();
  for (let y = min; y <= max; y++) {
    const op = document.createElement('option');
    op.value = String(y);
    op.textContent = String(y);
    selAno.appendChild(op);
  }
  selAno.value = 'all';
}

// ====== Render del gráfico ======
function renderChart() {
  const canvas = qs('grafico-precios');
  const msg    = qs('grafico-msg');
  const selTipo= qs('grafico-tipo');
  const selAno = qs('grafico-anio');

  if (!canvas || !selTipo) return;

  const tipoKey = selTipo.value || 'virgen_extra';
  const tipoTxt = TIPO_LABEL[tipoKey];
  const serie   = HISTORICO[tipoTxt] || [];

  // Sin datos
  if (!serie.length) {
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    if (grafico) { grafico.destroy(); grafico = null; }
    return;
  }
  if (msg) msg.textContent = '';

  // Qué año está seleccionado
  const yearSel = selAno ? selAno.value : 'all';

  // Determinar labels/values según MODO
  let labels = [], values = [], xTitle = '', yTitle = '€/kg';

  if (G_MODO === 'years') {
    const agg = groupByYear(serie);
    if (yearSel !== 'all') {
      const i = agg.labels.indexOf(String(yearSel));
      labels = i >= 0 ? [ agg.labels[i] ] : [];
      values = i >= 0 ? [ agg.values[i] ] : [];
    } else {
      labels = agg.labels;
      values = agg.values;
    }
    xTitle = 'Año';
  } else if (G_MODO === 'months') {
    let year = yearSel;
    if (year === 'all') {
      const { max } = getMinMaxYear();
      year = max;
    }
    const agg = groupByMonthInYear(serie, year);
    labels = agg.labels.map(m => `${year}-${m}`);
    values = agg.values;
    xTitle = 'Mes';
  } else { // 'days'
    let year = yearSel;
    if (year === 'all') {
      const r = lastNDays(serie, 60);
      labels = r.labels;
      values = r.values;
      xTitle = 'Día';
    } else {
      const r = dailyInYear(serie, year);
      labels = r.labels;
      values = r.values;
      xTitle = 'Día';
    }
  }

  // Pintar
  if (grafico) grafico.destroy();
  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: tipoTxt,
        data: values,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 2
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
        y: { title: { display: true, text: yTitle } }
      }
    }
  });
}

// ====== Carga de datos ======
async function cargarDatos() {
  const fechaEl     = qs('fecha');
  const precioEl    = qs('precio');
  const tablaInfoEl = qs('tabla-info');

  try {
    // JSON precios actuales
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Intentar cargar histórico desde JSON (si existe) y si no, desde historico.txt
    let historicoCargado = false;
    try {
      const rj = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (rj.ok) {
        HISTORICO = await rj.json();
        historicoCargado = true;
      }
    } catch { /* noop */ }

    if (!historicoCargado) {
      // fallback: historico.txt
      try {
        const rt = await fetch(`historico.txt?v=${Date.now()}`, { cache: 'no-store' });
        if (rt.ok) {
          const txt = await rt.text();
          parseHistoricoTexto(txt);
        } else {
          HISTORICO = {};
        }
      } catch {
        HISTORICO = {};
      }
    }

    // Fecha legible
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {/* noop */}
    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // Tabla actual
    renderTabla(datos.precios || {});

    // Normalizar selector
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = qs('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    actualizarPrecioSeleccion();
    calcular();

    // Listeners de calculadora
    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });

    qs('rendimiento')?.addEventListener('input', calcular);

    // ====== Gráfica ======
    // Poblar select de años
    populateYearSelect();

    // Select de tipo de gráfica
    const selGrafTipo = qs('grafico-tipo');
    if (selGrafTipo && !selGrafTipo.value) selGrafTipo.value = 'virgen_extra';

    // Listeners gráfico
    selGrafTipo?.addEventListener('change', renderChart);
    qs('grafico-anio')?.addEventListener('change', renderChart);

    // Botones modo
    const btnYears  = qs('btn-years')  || qs('btn-anios') || qs('btn-g-anios');
    const btnMonths = qs('btn-months') || qs('btn-meses') || qs('btn-g-meses');
    const btnDays   = qs('btn-days')   || qs('btn-dias')  || qs('btn-g-dias');

    const activateBtn = (btn) => {
      [btnYears, btnMonths, btnDays].forEach(b => b && b.classList.remove('active'));
      btn && btn.classList.add('active');
    };

    btnYears?.addEventListener('click', () => { G_MODO = 'years';  activateBtn(btnYears);  renderChart(); });
    btnMonths?.addEventListener('click', () => { G_MODO = 'months'; activateBtn(btnMonths); renderChart(); });
    btnDays?.addEventListener('click', () => { G_MODO = 'days';   activateBtn(btnDays);   renderChart(); });

    // Estado inicial: Años
    activateBtn(btnYears);
    G_MODO = 'years';
    renderChart();

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');
    const tabla = qs('tabla-precios');
    if (tabla) tabla.innerHTML = '';
    const res = qs('resultado');
    if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});
