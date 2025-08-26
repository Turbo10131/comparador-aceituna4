// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};     // precios actuales
let HISTORICO_MAP = {};   // histórico para la gráfica
let chart = null;         // instancia Chart.js

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

// Admite 3 formatos: (A) objeto por calidades; (B) etiquetas largas; (C) lista mensual con 3 columnas
function normalizaHistorico(h) {
  const out = { virgen_extra: [], virgen: [], lampante: [] };
  if (!h || typeof h !== 'object') return out;

  // Opción C: lista mensual con columnas por calidad
  if (Array.isArray(h)) {
    h.forEach(row => {
      const { fecha } = row || {};
      if (!fecha) return;
      if (row.virgen_extra) out.virgen_extra.push({ fecha, precio: Number(row.virgen_extra) });
      if (row.virgen)       out.virgen.push({ fecha, precio: Number(row.virgen) });
      if (row.lampante)     out.lampante.push({ fecha, precio: Number(row.lampante) });
    });
  } else {
    // Opción A/B: objeto por calidades (claves cortas o etiquetas largas)
    const keyMap = {
      'Aceite de oliva virgen extra': 'virgen_extra',
      'Aceite de oliva virgen': 'virgen',
      'Aceite de oliva lampante': 'lampante',
      'virgen_extra': 'virgen_extra',
      'virgen': 'virgen',
      'lampante': 'lampante',
    };
    Object.keys(h).forEach(k => {
      const key = keyMap[k] ?? null;
      if (!key || !Array.isArray(h[k])) return;
      out[key] = h[k]
        .map(p => ({
          fecha: p.fecha,
          precio: Number(
            (typeof p.precio_eur_kg !== 'undefined') ? p.precio_eur_kg : p.precio
          )
        }))
        .filter(p => p.fecha && !Number.isNaN(p.precio) && p.precio > 0 && p.precio < 20);
    });
  }

  // Ordenar y limitar a 24 meses
  Object.keys(out).forEach(k => {
    out[k] = (out[k] || [])
      .sort((a,b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-24);
  });

  return out;
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

  if (precio) setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  else if (key) setTexto(precioEl, '— Precio no disponible —');
  else setTexto(precioEl, '');
}

// ====== Calculadora (tabla 4 columnas) ======
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

// ====== Gráfica ======
function renderChartFor(key) {
  const empty = document.getElementById('chart-empty');
  const canvas = document.getElementById('chartPrecios');
  if (!canvas) return;

  const serie = HISTORICO_MAP[key] ?? [];
  if (!serie.length) {
    if (chart) { chart.destroy(); chart = null; }
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  const labels = serie.map(p => p.fecha);
  const data   = serie.map(p => p.precio);

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${TIPO_LABEL[key]} (€/kg)`,
        data,
        tension: 0.25,
        pointRadius: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true }, grid: { display:false } },
        y: { beginAtZero: false }
      },
      plugins: {
        legend: { display: true },
        tooltip: { callbacks: { label: (ctx) => ` ${euros(ctx.parsed.y)}` } }
      }
    }
  });
}

// ====== Modal ======
function setupFuenteModal() {
  const link = document.getElementById('fuente-link');
  const modal = document.getElementById('fuente-modal');
  const closeBtn = document.getElementById('modal-close');
  if (!link || !modal || !closeBtn) return;

  const open = () => { modal.classList.add('open'); link.blur(); };
  const close = () => { modal.classList.remove('open'); link.focus(); };

  link.addEventListener('click', e => { e.preventDefault(); open(); });
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
}

// ====== Carga de histórico extra (archivos opcionales) ======
async function cargarHistoricoExterno() {
  const candidatos = [
    'precio-aceite-historico.json',
    'historico.json'
  ];
  for (const url of candidatos) {
    try {
      const r = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j?.historico) return j.historico;
      // permitir que el archivo ya sea directamente el bloque esperado
      return j;
    } catch { /* seguir intentando */ }
  }
  return null;
}

// ====== Carga de datos ======
async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');      // puede no existir
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Fecha legible
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {}

    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // Tabla de precios
    renderTabla(datos.precios || {});

    // Normaliza actuales
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    // Pintar precio y cálculo inicial
    actualizarPrecioSeleccion();
    calcular();

    // ===== Gráfica =====
    // 1) intentar usar datos.historico
    let historicoRaw = datos.historico || null;
    // 2) si no hay, intentar cargar de fichero externo
    if (!historicoRaw) {
      historicoRaw = await cargarHistoricoExterno();
    }
    HISTORICO_MAP = normalizaHistorico(
      historicoRaw?.historico ?? historicoRaw
    );

    const serieSel = document.getElementById('serie-calidad');
    let grafKey = sel?.value || 'virgen_extra';
    if (!HISTORICO_MAP[grafKey]?.length) {
      grafKey = ['virgen_extra','virgen','lampante'].find(k => HISTORICO_MAP[k]?.length) || grafKey;
    }
    if (serieSel) serieSel.value = grafKey;
    renderChartFor(grafKey);

    // Listeners
    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);
    serieSel?.addEventListener('change', () => renderChartFor(serieSel.value));

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');

    const tabla = document.getElementById('tabla-precios');
    if (tabla) tabla.innerHTML = '';

    const res = document.getElementById('resultado');
    if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }

    const empty = document.getElementById('chart-empty');
    if (empty) empty.style.display = '';
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal(); // modal “De dónde obtenemos los precios”
});
