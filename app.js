// app.js

// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};  // precios actuales normalizados
let HISTORICO   = {};  // JSON histórico
let grafico     = null; // referencia Chart.js
let ESCALA_ACTUAL = 'months'; // years | months | days

// ====== Utilidades ======
function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }
function parseYMD(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, (m??1)-1, d||1); }
function fmtYMD(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }

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
  cerrar.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

/* ====== Serie para la gráfica según escala ======
   - months: usa los puntos tal cual (mensuales)
   - years: media anual
   - days:  interpolación lineal entre meses a resolución diaria
*/
function prepararSerie(tipo, escala){
  const serie = HISTORICO[TIPO_LABEL[tipo]];
  if(!Array.isArray(serie) || !serie.length) return {labels:[],data:[]};

  const orden = [...serie].sort((a,b)=>parseYMD(a.fecha)-parseYMD(b.fecha));

  if(escala==='months'){
    return { labels: orden.map(x=>x.fecha), data: orden.map(x=>+x.precio_eur_kg) };
  }

  if(escala==='years'){
    const agreg = new Map(); // año -> {sum, n}
    for(const p of orden){
      const y = parseYMD(p.fecha).getFullYear();
      const cur = agreg.get(y) || {sum:0, n:0};
      cur.sum += +p.precio_eur_kg; cur.n++;
      agreg.set(y, cur);
    }
    const years = [...agreg.keys()].sort((a,b)=>a-b);
    return { labels: years.map(String), data: years.map(y => agreg.get(y).sum/agreg.get(y).n) };
  }

  // days (interpolado)
  const labels = [], data = [];
  for(let i=0;i<orden.length-1;i++){
    const a = orden[i], b = orden[i+1];
    const da = parseYMD(a.fecha), db = parseYMD(b.fecha);
    const pa = +a.precio_eur_kg, pb = +b.precio_eur_kg;

    const ONE = 86400000;
    const total = Math.max(1, Math.round((db - da)/ONE));
    for(let t=0;t<total;t++){
      const cur = new Date(da.getTime() + t*ONE);
      const frac = t/total;
      labels.push(fmtYMD(cur));
      data.push(pa + (pb - pa)*frac);
    }
  }
  // último punto real
  const last = orden[orden.length-1];
  labels.push(last.fecha); data.push(+last.precio_eur_kg);
  return {labels, data};
}

// ====== Render gráfico ======
function renderChart(tipo) {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  if (!canvas) return;

  const {labels, data} = prepararSerie(tipo, ESCALA_ACTUAL);
  if (!labels.length) {
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    if (grafico) { grafico.destroy(); grafico = null; }
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
        data,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.1)',
        fill: true,
        tension: ESCALA_ACTUAL === 'days' ? 0.15 : 0.25,
        pointRadius: ESCALA_ACTUAL === 'days' ? 0 : 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: (ESCALA_ACTUAL === 'years' ? 'Año' : 'Fecha') } },
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// ====== Botones de escala (Años / Meses / Días) ======
function setupEscala() {
  const grupo = document.getElementById('escala-grupo');
  const selTipo = document.getElementById('grafico-tipo');
  if (!grupo) return;

  grupo.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg[data-escala]');
    if (!btn) return;
    grupo.querySelectorAll('.seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ESCALA_ACTUAL = btn.dataset.escala;
    renderChart(selTipo.value);
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

    // Normaliza selector
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

    // Listeners gráfica
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
  setupEscala();
});
