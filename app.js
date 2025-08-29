// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};
let HISTORICO = {};
let grafico = null;
let modoGrafico = 'anios'; // 'anios' | 'meses' | 'dias'

// ====== Utilidades ======
function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }
function toISOfromDMY(dmy) {
  const m = dmy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
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

// ====== Tabla ======
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

// ====== Precio seleccionado ======
function actualizarPrecioSeleccion() {
  const sel = document.getElementById('tipo');
  const precioEl = document.getElementById('precio');
  if (!sel || !precioEl) return;
  const key = sel.value;
  const precio = PRECIOS_MAP[key];
  if (precio) setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  else if (key) setTexto(precioEl, '— Precio no disponible —');
  else setTexto(precioEl, '');
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
        <td>${rendimiento}%</td>
        <td>${TIPO_LABEL[key]}</td>
        <td>${precio.toFixed(3)} €/kg</td>
        <td><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
      </tr></tbody>
    </table>`;
}

// ====== Modal ======
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

// ====== Parseo historico.txt ======
function parseHistoricoTexto(txt) {
  const lineas = txt.split(/\r?\n/);
  const precioRe = /(Aceite de oliva virgen extra|Aceite de oliva virgen|Aceite de oliva lampante)[^0-9]*([\d.,]+)\s*€/i;
  const fechaRe  = /^(\d{2}-\d{2}-\d{4})$/;

  HISTORICO = {
    'Aceite de oliva virgen extra': [],
    'Aceite de oliva virgen': [],
    'Aceite de oliva lampante': [],
  };

  let buffer = [];
  for (const raw of lineas) {
    const linea = raw.trim();

    const mp = linea.match(precioRe);
    if (mp) {
      const tipo = mp[1];
      const val = parseFloat(String(mp[2]).replace(',', '.'));
      if (!isNaN(val) && val > 0 && val < 20) buffer.push({ tipo, valor: val });
      continue;
    }

    const mf = linea.match(fechaRe);
    if (mf) {
      const iso = toISOfromDMY(mf[1]);
      if (iso && buffer.length) {
        for (const p of buffer) {
          HISTORICO[p.tipo].push({ fecha: iso, precio_eur_kg: p.valor });
        }
        buffer = [];
      }
      continue;
    }
  }

  for (const k of Object.keys(HISTORICO)) {
    HISTORICO[k].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}

// ====== Agregación ======
function agrega(datos, modo) {
  if (!datos || !datos.length) return { labels: [], valores: [], xTitle: '' };
  const toDate = (s) => new Date(s + 'T00:00:00');
  const byKey = new Map();

  if (modo === 'anios') {
    for (const d of datos) {
      const y = d.fecha.slice(0, 4);
      const arr = byKey.get(y) || [];
      arr.push(d.precio_eur_kg);
      byKey.set(y, arr);
    }
    const labels = Array.from(byKey.keys()).sort();
    const valores = labels.map(k => {
      const xs = byKey.get(k);
      return xs.reduce((a, v) => a + v, 0) / xs.length;
    });
    return { labels, valores, xTitle: 'Año' };
  }

  if (modo === 'meses') {
    const ultimo = toDate(datos[datos.length - 1].fecha);
    const limite = new Date(ultimo); limite.setMonth(limite.getMonth() - 23);
    for (const d of datos) {
      const dt = toDate(d.fecha);
      if (dt < limite) continue;
      const ym = d.fecha.slice(0, 7);
      const arr = byKey.get(ym) || [];
      arr.push(d.precio_eur_kg);
      byKey.set(ym, arr);
    }
    const labels = Array.from(byKey.keys()).sort();
    const valores = labels.map(k => {
      const xs = byKey.get(k);
      return xs.reduce((a, v) => a + v, 0) / xs.length;
    });
    return { labels, valores, xTitle: 'Mes' };
  }

  // 'dias' últimos 60 días (último valor del día)
  const ultimo = toDate(datos[datos.length - 1].fecha);
  const limite = new Date(ultimo); limite.setDate(limite.getDate() - 59);
  const mapUlt = new Map();
  for (const d of datos) {
    const dt = toDate(d.fecha);
    if (dt < limite) continue;
    mapUlt.set(d.fecha, d.precio_eur_kg);
  }
  const labels = Array.from(mapUlt.keys()).sort();
  const valores = labels.map(k => mapUlt.get(k));
  return { labels, valores, xTitle: 'Día' };
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

  const { labels, valores, xTitle } = agrega(datos, modoGrafico);

  if (grafico) grafico.destroy();
  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: TIPO_LABEL[tipo],
        data: valores,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.10)',
        fill: true,
        tension: 0.2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: xTitle || '' } },
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// ====== Estado visual + listeners ======
function setModoAndButtons(nuevo) {
  modoGrafico = nuevo;
  const bA = document.getElementById('btn-anios');
  const bM = document.getElementById('btn-meses');
  const bD = document.getElementById('btn-dias');
  [bA, bM, bD].forEach(b => b?.classList.remove('active'));
  if (nuevo === 'anios')  bA?.classList.add('active');
  if (nuevo === 'meses')  bM?.classList.add('active');
  if (nuevo === 'dias')   bD?.classList.add('active');

  const selGraf = document.getElementById('grafico-tipo');
  if (selGraf) renderChart(selGraf.value);
}

// ====== Carga ======
async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // histórico TXT
    try {
      const resHist = await fetch(`historico.txt?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) {
        const txt = await resHist.text();
        parseHistoricoTexto(txt);
      } else {
        HISTORICO = {};
      }
    } catch { HISTORICO = {}; }

    // Fecha legible
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {}

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

    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    const selGraf = document.getElementById('grafico-tipo');
    selGraf?.addEventListener('change', () => renderChart(selGraf.value));

    // Botones rango tiempo
    document.getElementById('btn-anios')?.addEventListener('click', () => setModoAndButtons('anios'));
    document.getElementById('btn-meses')?.addEventListener('click', () => setModoAndButtons('meses'));
    document.getElementById('btn-dias') ?.addEventListener('click', () => setModoAndButtons('dias'));

    // Render inicial
    setModoAndButtons('anios');

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');

    const tabla = document.getElementById('tabla-precios');
    if (tabla) tabla.innerHTML = '';

    const res = document.getElementById('resultado');
    if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});
