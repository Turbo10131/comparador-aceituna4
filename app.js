// ====== Etiquetas -> claves ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};
let HISTORICO = {};
let grafico = null;

// modo: "anios" | "meses" | "dias"
let modo = 'anios';
let anioSeleccionado = ''; // '' = "Todos los años"

// ====== Utilidades ======
const setTexto  = (el, txt) => { if (el) el.textContent = txt; };
const euros     = (n) => `${Number(n).toFixed(3)} €/kg`;

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

// ====== Tabla de precios ======
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
      <thead><tr><th>Tipo de aceite de oliva</th><th>Precio €/kg</th></tr></thead>
      <tbody>${cuerpo}</tbody>
    </table>`;
}

// ====== Precio seleccionado (encima de la calc) ======
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
    res.innerHTML = `<strong>Falta información:</strong> selecciona una calidad con precio disponible y escribe un rendimiento entre 0 y 100.`;
    return;
  }
  const precioAceituna = (rendimiento / 100) * precio;
  res.classList.remove('error');
  res.innerHTML = `
    <table class="calc-table">
      <thead><tr><th>Rendimiento (%)</th><th>Calidad del Aceite</th><th>Precio del Aceite</th><th>Precio aceituna (€/kg)</th></tr></thead>
      <tbody><tr>
        <td data-label="Rendimiento (%)">${rendimiento}%</td>
        <td data-label="Calidad del Aceite">${TIPO_LABEL[key]}</td>
        <td data-label="Precio del Aceite">${precio.toFixed(3)} €/kg</td>
        <td data-label="Precio aceituna (€/kg)"><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
      </tr></tbody>
    </table>`;
}

// ====== Modal “Fuente” ======
function setupFuenteModal() {
  const link = document.getElementById('fuente-link');
  const modal = document.getElementById('fuente-modal');
  const cerrar = document.getElementById('modal-close');
  if (!link || !modal || !cerrar) return;

  link.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('open'); });
  cerrar.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

// ====== Gráfica ======

function setActivos() {
  const bA = document.getElementById('btn-anios');
  const bM = document.getElementById('btn-meses');
  const bD = document.getElementById('btn-dias');
  bA.classList.toggle('active', modo === 'anios');
  bM.classList.toggle('active', modo === 'meses');
  bD.classList.toggle('active', modo === 'dias');
}

function poblarSelectAnios() {
  const selAnio = document.getElementById('grafico-anio');
  if (!selAnio) return;

  const aniosSet = new Set();
  Object.values(HISTORICO).forEach(lista => {
    lista.forEach(d => {
      if (d.fecha) {
        const y = new Date(d.fecha).getFullYear();
        if (!isNaN(y)) aniosSet.add(y);
      }
    });
  });
  const anios = Array.from(aniosSet).sort((a,b) => a-b);

  selAnio.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'Todos los años';
  selAnio.appendChild(optAll);

  anios.forEach(y => {
    const o = document.createElement('option');
    o.value = String(y);
    o.textContent = String(y);
    selAnio.appendChild(o);
  });

  // Si había un año seleccionado que ya no existe, reset
  if (anioSeleccionado && !anios.includes(Number(anioSeleccionado))) {
    anioSeleccionado = '';
  }
  selAnio.value = anioSeleccionado;
}

function agregaPorAnio(lista) {
  // media por año
  const map = new Map();
  lista.forEach(d => {
    const y = new Date(d.fecha).getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(d.precio_eur_kg);
  });
  const anios = Array.from(map.keys()).sort((a,b)=>a-b);
  const labels = [];
  const valores = [];
  anios.forEach(y => {
    const arr = map.get(y);
    const avg = arr.reduce((a,b)=>a+b, 0)/arr.length;
    labels.push(String(y));
    valores.push(Number(avg.toFixed(3)));
  });
  return { labels, valores, xTitle:'Año' };
}

function agregaPorMes(lista, anio) {
  const datos = lista.filter(d => new Date(d.fecha).getFullYear() === anio);
  const map = new Map(); // mes 1..12 -> precios
  datos.forEach(d => {
    const dt = new Date(d.fecha);
    const m = dt.getMonth()+1;
    if (!map.has(m)) map.set(m, []);
    map.get(m).push(d.precio_eur_kg);
  });
  const ms = Array.from(map.keys()).sort((a,b)=>a-b);
  const labels = ms.map(m => `${String(anio)}-${String(m).padStart(2,'0')}`);
  const valores = ms.map(m => {
    const arr = map.get(m);
    return Number((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(3));
  });
  return { labels, valores, xTitle:'Mes' };
}

function agregaPorDia(lista, anio) {
  const datos = lista.filter(d => new Date(d.fecha).getFullYear() === anio);
  datos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  const labels = datos.map(d => d.fecha);
  const valores = datos.map(d => Number(d.precio_eur_kg.toFixed(3)));
  return { labels, valores, xTitle:'Día' };
}

function getDataset(tipo) {
  return HISTORICO[TIPO_LABEL[tipo]] || [];
}

function ultimoAnioDisponible() {
  const set = new Set();
  Object.values(HISTORICO).forEach(lista => {
    lista.forEach(d => set.add(new Date(d.fecha).getFullYear()));
  });
  if (!set.size) return null;
  return Math.max(...Array.from(set));
}

function renderChart() {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  const selTipo = document.getElementById('grafico-tipo');
  const selAnio = document.getElementById('grafico-anio');
  if (!canvas || !selTipo) return;

  const tipo = selTipo.value;
  const datos = getDataset(tipo);
  if (!datos.length) {
    if (grafico) { grafico.destroy(); grafico = null; }
    setTexto(msg, 'No hay datos históricos para mostrar.');
    return;
  }
  setTexto(msg, '');

  let labels = [], valores = [], xTitle = '';

  if (modo === 'anios') {
    const r = agregaPorAnio(datos);
    labels = r.labels; valores = r.valores; xTitle = r.xTitle;
    // en vista años, dejamos "Todos los años" en el selector
    anioSeleccionado = '';
    if (selAnio) selAnio.value = '';
  } else if (modo === 'meses') {
    let y = anioSeleccionado ? Number(anioSeleccionado) : ultimoAnioDisponible();
    anioSeleccionado = String(y);
    if (selAnio) selAnio.value = anioSeleccionado;
    const r = agregaPorMes(datos, y);
    labels = r.labels; valores = r.valores; xTitle = r.xTitle;
  } else {
    let y = anioSeleccionado ? Number(anioSeleccionado) : ultimoAnioDisponible();
    anioSeleccionado = String(y);
    if (selAnio) selAnio.value = anioSeleccionado;
    const r = agregaPorDia(datos, y);
    labels = r.labels; valores = r.valores; xTitle = r.xTitle;
  }

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
        x: { title: { display: true, text: xTitle }},
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// ====== Carga de datos ======
async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // histórico
    try {
      const resHist = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) HISTORICO = await resHist.json();
      else HISTORICO = {};
    } catch { HISTORICO = {}; }

    // fecha
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {}
    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // tabla
    renderTabla(datos.precios || {});

    // selects y valores actuales
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }
    actualizarPrecioSeleccion();
    calcular();

    // listeners básicos
    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });

    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    // gráfica: popular años y listeners
    poblarSelectAnios();
    const selTipoGraf = document.getElementById('grafico-tipo');
    const selAnio = document.getElementById('grafico-anio');
    selTipoGraf.addEventListener('change', renderChart);
    selAnio.addEventListener('change', () => {
      anioSeleccionado = selAnio.value;
      renderChart();
    });

    // botones modo
    document.getElementById('btn-anios').addEventListener('click', () => { modo = 'anios'; setActivos(); renderChart(); });
    document.getElementById('btn-meses').addEventListener('click', () => { modo = 'meses'; setActivos(); renderChart(); });
    document.getElementById('btn-dias').addEventListener('click', () => { modo = 'dias';  setActivos(); renderChart(); });

    // estado inicial
    setActivos();
    renderChart();

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});
