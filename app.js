// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // precios actuales
let HISTORICO = {};   // histórico (json o txt)
let grafico = null;   // Chart.js instance
let modoGraf = 'years'; // 'years' | 'months' | 'days'

// ====== Utilidades ======
const setTexto = (el, txt) => { if (el) el.textContent = txt; };
const euros = (n) => `${Number(n).toFixed(3)} €/kg`;

// Normaliza JSON precios actuales -> mapa por clave corta
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

  link.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('open'); });
  cerrar.addEventListener('click',   () => modal.classList.remove('open'));
  modal.addEventListener('click',    (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

// ====== Parser de historico.txt (flexible con coma o punto decimal) ======
function parseHistoricoTxt(txt) {
  // Estructura destino: { 'Aceite de oliva virgen extra': [{fecha:'YYYY-MM-DD', precio_eur_kg: n}, ...], ... }
  const out = {
    'Aceite de oliva virgen extra': [],
    'Aceite de oliva virgen': [],
    'Aceite de oliva lampante': []
  };

  const lines = txt.split(/\r?\n/);

  let fechaActual = null;
  const fechaRegexp = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // ¿Línea de fecha?
    const fm = line.match(fechaRegexp);
    if (fm) {
      const d = fm[1].padStart(2, '0');
      const m = fm[2].padStart(2, '0');
      let y = fm[3];
      if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
      fechaActual = `${y}-${m}-${d}`;
      continue;
    }

    // Ignorar líneas sin cierre
    if (/Sin\s+cierre/i.test(line)) continue;

    // Extraer nombre del tipo y precio
    const tipos = Object.keys(out);
    for (const tipo of tipos) {
      if (line.toLowerCase().includes(tipo.toLowerCase())) {
        const numMatch = line.match(/(\d+[.,]?\d*)/g);
        if (!numMatch || !fechaActual) break;
        const numRaw = numMatch[numMatch.length - 1].replace(',', '.');
        const valor = Number(numRaw);
        if (!isNaN(valor) && valor > 0 && valor < 20) {
          out[tipo].push({ fecha: fechaActual, precio_eur_kg: valor });
        }
        break;
      }
    }
  }

  // Ordenar por fecha asc y consolidar (si hay duplicados por fecha, quedarse con el último)
  for (const tipo of Object.keys(out)) {
    const map = new Map();
    for (const p of out[tipo]) map.set(p.fecha, p.precio_eur_kg);
    const arr = [...map.entries()]
      .map(([fecha, precio_eur_kg]) => ({ fecha, precio_eur_kg }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    out[tipo] = arr;
  }
  return out;
}

// ====== Helpers para construir series por modo ======
function seriePorAnios(datos) {
  // NO recortar: usar TODO el histórico agrupado por año (media anual)
  const buckets = {};
  datos.forEach(d => {
    const y = d.fecha.slice(0, 4);
    if (!buckets[y]) buckets[y] = [];
    buckets[y].push(d.precio_eur_kg);
  });

  const labels = Object.keys(buckets).sort((a, b) => a.localeCompare(b));
  const values = labels.map(y => {
    const arr = buckets[y];
    const media = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Number(media.toFixed(3));
  });

  return { labels, values };
}

function seriePorMeses(datos, limiteMeses = 24) {
  // Agrupar por YYYY-MM (media mensual) y recortar a últimos `limiteMeses`
  const buckets = {};
  datos.forEach(d => {
    const ym = d.fecha.slice(0, 7); // YYYY-MM
    if (!buckets[ym]) buckets[ym] = [];
    buckets[ym].push(d.precio_eur_kg);
  });

  let labels = Object.keys(buckets).sort((a, b) => a.localeCompare(b));
  let values = labels.map(k => {
    const arr = buckets[k];
    const media = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Number(media.toFixed(3));
  });

  if (limiteMeses && labels.length > limiteMeses) {
    labels = labels.slice(-limiteMeses);
    values = values.slice(-limiteMeses);
  }

  // Bonito para eje X
  labels = labels.map(ym => {
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  });

  return { labels, values };
}

function seriePorDias(datos, limiteDias = 90) {
  // Recorta últimos N días (si el histórico es diario), si es mensual se verán menos puntos y está bien
  let arr = [...datos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (limiteDias && arr.length > limiteDias) arr = arr.slice(-limiteDias);

  const labels = arr.map(d => {
    const date = new Date(d.fecha);
    return date.toLocaleDateString('es-ES');
  });
  const values = arr.map(d => d.precio_eur_kg);
  return { labels, values };
}

// ====== Render del gráfico ======
function renderChart(tipo) {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  if (!canvas) return;

  const datos = HISTORICO[TIPO_LABEL[tipo]];
  if (!datos || !datos.length) {
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    if (grafico) { grafico.destroy(); grafico = null; }
    return;
  }
  if (msg) msg.textContent = '';

  let series;
  if (modoGraf === 'years') {
    series = seriePorAnios(datos);       // <-- sin recortes
  } else if (modoGraf === 'months') {
    series = seriePorMeses(datos, 24);
  } else {
    series = seriePorDias(datos, 90);
  }

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [{
        label: TIPO_LABEL[tipo],
        data: series.values,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.10)',
        pointRadius: 3,
        fill: true,
        tension: 0.25
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
        x: {
          title: { display: true, text: modoGraf === 'years' ? 'Año' : (modoGraf === 'months' ? 'Mes' : 'Fecha') },
          ticks: {
            autoSkip: modoGraf !== 'years', // en años mostramos TODOS los años
            maxRotation: 0
          }
        },
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
    // Precios actuales
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Histórico: primero JSON; si no, historico.txt
    HISTORICO = {};
    try {
      const resHist = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) {
        HISTORICO = await resHist.json();
      } else {
        const resTxt = await fetch(`historico.txt?v=${Date.now()}`, { cache: 'no-store' });
        if (resTxt.ok) {
          const txt = await resTxt.text();
          HISTORICO = parseHistoricoTxt(txt);
        }
      }
    } catch { /* noop */ }

    // Fecha legible
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {/* noop */}

    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // Tabla
    renderTabla(datos.precios || {});

    // Selector y calculadora
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }
    actualizarPrecioSeleccion();
    calcular();

    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); renderChart(selGraf.value); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    // Controles de gráfica
    const selGraf = document.getElementById('grafico-tipo');
    const btnYears = document.getElementById('btn-years');
    const btnMonths = document.getElementById('btn-months');
    const btnDays = document.getElementById('btn-days');

    // Estado inicial
    if (selGraf && !selGraf.value) selGraf.value = sel?.value || 'virgen_extra';
    selGraf?.addEventListener('change', () => renderChart(selGraf.value));

    const setActive = (btn) => {
      [btnYears, btnMonths, btnDays].forEach(b => b?.classList.remove('active'));
      btn?.classList.add('active');
    };

    btnYears?.addEventListener('click', () => { modoGraf = 'years';  setActive(btnYears);  renderChart(selGraf.value); });
    btnMonths?.addEventListener('click',() => { modoGraf = 'months'; setActive(btnMonths); renderChart(selGraf.value); });
    btnDays?.addEventListener('click',  () => { modoGraf = 'days';   setActive(btnDays);   renderChart(selGraf.value); });

    // Pintar primera vez
    setActive(btnYears); // por defecto "Años"
    renderChart(selGraf?.value || 'virgen_extra');

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
